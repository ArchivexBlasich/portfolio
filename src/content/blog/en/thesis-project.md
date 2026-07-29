---
title: "Design, Implementation and Deployment of an On-Premise Electronic Document Signing System for FACET"
description: "How I deployed Documenso on a 2010 Xeon with no AVX support, bridged Docker to physical storage with Socat, and built a signing platform that costs $0/year in licensing."
image: ../../../assets/blog/thesis-project.png
date: 2026-07-29
translationKey: thesis-project
draft: false
---

FACET — the School of Exact Sciences and Technology at the National University of Tucumán (UNT) — had a document signing workflow that looked like this: download a PDF, sign it with an external tool, email it to the next person, wait for them to repeat the process. No traceability. No audit trail. Human errors at every handoff.

Commercial solutions exist. DocuSign, Adobe Sign, Dropbox Sign. The cheapest viable plan for 20 users came to $5,326 USD per year. That is not realistic for a public university in Argentina. And the university already had the technical resources to deploy an open-source solution — servers, storage, network. There was no reason to pay for something we could run ourselves.

This is how I built an alternative for $0/year in licensing, running entirely on institutional hardware.

## Why self-hosted

The decision was not ideological. It was practical:

- **Zero licensing cost.** Documenso is open-source under AGPL-3.0.
- **Full data sovereignty.** Signed documents never leave institutional servers. For a public university handling administrative resolutions, this matters.
- **Google Workspace integration.** The faculty already uses Google accounts. Documenso supports Google OAuth out of the box.

I evaluated DocuSeal and Documenso side by side. Documenso won because role-based access control, Google OAuth, and branding customization are free in the open-source core. DocuSeal locks those features behind its PRO tier.

## The architecture

The stack runs on three layers:

**Edge layer.** An Nginx reverse proxy handles SSL termination with Let's Encrypt certificates. All inbound HTTPS traffic hits Nginx first, which forwards to the PaaS layer over plain HTTP on the internal network.

**PaaS layer.** Coolify runs inside an LXC container on Proxmox VE. It manages deployments, environment variables, and dynamic routing through an internal Traefik instance. Coolify gives me a dashboard for redeployments and rollbacks without touching Docker Compose files manually.

**Service layer.** Four Docker containers on a single bridge network:

| Container   | Image                        | Purpose                              |
| ----------- | ---------------------------- | ------------------------------------ |
| documenso   | `documenso/documenso:v2.1.0` | E-signature application              |
| postgres    | `postgres:17-alpine`         | Primary database                     |
| browserless | `browserless/chrome`         | Headless Chromium for PDF generation |
| socat       | `alpine/socat`               | TCP bridge to physical MinIO storage |

![PaaS internal topology showing Coolify, Traefik, and the Docker host](/images/blog/thesis-project/paas-topology.png)

![Docker internal network with all four containers and their connections](/images/blog/thesis-project/docker-network.png)

## Key technical decisions

These are the problems that actually took time to solve.

### Browserless: the missing Chromium

After completing the first end-to-end signing cycle, documents stayed stuck in `PENDING` state. The signing flow worked, but the final PDF with the embedded certificate was never generated.

The logs told the story:

```
internal.seal-document job failed:
Executable doesn't exist at /home/nodejs/.cache/ms-playwright/chromium_headless_shell
```

Documenso's Docker image does not include Chromium. But the signing certificate PDF generation depends on Playwright, which needs a headless browser to render the certificate page into a PDF overlay.

This is not documented in the official setup guide. I found it through the community Discord and GitHub issues [#2060](https://github.com/documenso/documenso/issues/2060) and [#1634](https://github.com/documenso/documenso/issues/1634).

The fix is to deploy `browserless/chrome` as an auxiliary service and connect it via WebSocket:

```yaml
browserless:
  image: browserless/chrome
  restart: unless-stopped
  environment:
    MAX_CONCURRENT_SESSIONS: 5
    CONNECTION_TIMEOUT: 600000
  deploy:
    resources:
      limits:
        cpus: "2"
        memory: 2g
```

Then in Documenso's environment:

```text
NEXT_PRIVATE_BROWSERLESS_URL=ws://browserless:3000
```

The resource limits matter. Chromium is memory-hungry, and without `MAX_CONCURRENT_SESSIONS=5`, a burst of simultaneous signing requests can OOM the container.

### Socat proxy: bridging Docker to physical storage

Documenso uses a single environment variable for S3-compatible object storage:

```text
NEXT_PRIVATE_UPLOAD_ENDPOINT=http://minio:9000
```

Here is the problem: both the browser (for branding images like logos) and the backend (for signed PDFs) must reach the same URL. But the MinIO server lives on a physical TrueNAS box outside Docker's virtual network.

The browser can reach it via the public domain. The backend, running inside a Docker container, cannot route to a physical server on the LAN without help.

The solution is a Socat container that bridges Docker's virtual network to the physical TrueNAS/MinIO server:

```yaml
socat:
  image: alpine/socat
  restart: unless-stopped
  command: "tcp-listen:9000,fork,reuseaddr tcp-connect:TRUENAS_IP:9000"
```

Inside Docker, `minio:9000` resolves to the Socat container, which forwards TCP traffic to the real MinIO server. The browser hits the public domain, the backend hits Socat, and both reach the same storage.

![MinIO and Socat flow diagram showing browser and backend paths to object storage](/images/blog/thesis-project/minio-flow.png)

Two additional configuration details that caused real problems:

- **CORS on MinIO.** The browser uploads branding images directly to MinIO. Without CORS headers allowing the Documenso origin, those requests fail silently.
- **`client_max_body_size` on Nginx.** Set to 50MB for the Documenso app and 75MB for the MinIO proxy. Signed PDFs are larger than the originals because they embed the certificate and signature appearance. A 30MB upload that becomes a 52MB signed PDF will get rejected by a 50MB limit on the MinIO path.

### Version pinning: CPU instructions as a deployment constraint

Documenso v2.2.0 and later require AVX/AVX2 CPU instructions. The dependency chain is: Documenso uses Sharp for image processing, Sharp bundles libvips, and recent libvips builds are compiled with AVX SIMD optimizations.

The faculty's server runs a Xeon E5620. That is a Westmere-EP processor from 2010. It does not support AVX.

I verified this on the host:

```bash
lscpu | grep -i avx
# (empty output)
```

AVX was introduced with Sandy Bridge in 2011. The E5620 predates it by a year.

The consequence: Documenso is pinned at v2.1.0. The container crashes on startup with any newer version because Sharp's native module tries to execute AVX instructions that the CPU does not implement.

CPU instruction sets as a deployment constraint. That is not something you think about on modern cloud instances where every VM runs on recent hardware. But on institutional servers with long amortization cycles, it is a real wall.

This is documented as technical debt. The hardware migration that unlocks Documenso updates is a separate project.

### Authentication: Google OAuth 2.0 restricted to one domain

Internal users authenticate through Google OAuth 2.0, restricted to the `@herrera.unt.edu.ar` domain. Local signup is disabled:

```text
NEXT_PUBLIC_DISABLE_SIGNUP=true
```

When someone tries to log in with a non-institutional Google account, Google's authorization layer returns `403: org_internal` before they ever reach Documenso. The restriction is enforced at the identity provider level, not the application level.

External signers (document recipients) can have any email domain. They do not need accounts. They access documents through unique, time-limited signing links sent by email.

### Cryptographic signing: self-signed certificate

Documenso applies a digital signature to each PDF using a PKCS#12 certificate. The certificate is injected as a Base64-encoded environment variable, not mounted as a file:

```text
NEXT_PRIVATE_SIGNING_PASSPHRASE=<passphrase>
NEXT_PRIVATE_SIGNING_CERT=<base64-encoded-p12>
```

I generated the certificate with OpenSSL:

```bash
openssl req -x509 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -days 3650 -nodes \
  -subj "/C=AR/ST=Tucuman/L=San Miguel de Tucuman/O=UNT/OU=FACET/CN=documentos.facet.unt.edu.ar"

openssl pkcs12 -export -out cert.p12 \
  -inkey key.pem -in cert.pem
```

RSA 2048-bit, X.509 self-signed, 10-year validity.

Under Argentine Law 25.506, this qualifies as an "electronic signature," not a "digital signature." The distinction is legal, not technical: a "digital signature" requires a certificate issued by a licensed Certification Authority under the national PKI. An "electronic signature" is valid for internal administrative use but does not carry the same evidentiary weight in court.

Adobe Acrobat shows "validity unknown" when opening signed documents, which is expected behavior for a self-signed certificate. It does confirm document integrity: any modification after signing invalidates the signature.

## Backup strategy

Three domains with different retention requirements:

**PostgreSQL.** Daily `pg_dump` to MinIO, 30-day retention, 5 GB quota. RPO of 24 hours. The database is small (metadata, user accounts, audit logs) but irreplaceable.

**Documents.** MinIO ILM policy with 5-year retention, 2 TB quota, Object Lock in governance mode. Once a signed PDF lands in the bucket, it cannot be deleted or modified until the retention period expires, even by the root user.

**Configuration.** Daily `tar.gz` of `docker-compose.yml` and `.env` files, 180-day retention. Recreating the environment from scratch takes hours. Restoring from backup takes minutes.

Backup restoration was tested before going live. No production intervention is acceptable without a verified backup.

## Performance results

The entire stack runs inside an LXC container with 8 GiB of RAM and 4 CPU cores allocated from the Proxmox host.

**Baseline** (idle, no active signing): approximately 397 MiB RAM, which is 5% of the LXC allocation. CPU usage is near zero.

**Peak load** (5 concurrent document signing operations): RAM climbed to 1,338 MiB, or 16.3% of available memory. Browserless hit 100% CPU for about 60 seconds while rendering the certificate PDFs, then dropped back to baseline.

![CPU usage under load showing Browserless spike during concurrent signing](/images/blog/thesis-project/performance-cpu.png)

![RAM usage under load showing peak at 1,338 MiB during concurrent signing](/images/blog/thesis-project/performance-ram.png)

Even in the worst case, the stack consumed 16.3% of available RAM. The remaining 83.7% is headroom for the other services running on the same Proxmox host.

## What I would do differently

**TrueNAS is a single point of failure.** All signed documents live on one physical server with no off-site replication. A disk failure with a failed RAID rebuild would mean data loss. The next step is replicating the MinIO bucket to a second location.

**Single compute node.** The Proxmox host is one machine. If it goes down, everything goes down. Docker Swarm or K3s across multiple nodes would provide HA, but that is a larger infrastructure project.

**Hardware migration is blocking updates.** The Xeon E5620 pins Documenso at v2.1.0. Every security patch and feature release upstream is inaccessible until the hardware supports AVX. This is the most urgent item on the backlog.

**Self-signed to licensed CA.** Moving from an electronic signature to a digital signature requires a certificate from a licensed CA under Argentina's national PKI. The technical implementation is trivial (swap the `.p12` file). The bureaucratic process of obtaining the certificate is not.

## Defense presentation

Here are the slides from my thesis defense. Use the arrow keys or swipe to navigate.

<iframe
  src="/presentacion/index.html"
  title="Thesis defense presentation — Electronic Document Signing System for FACET"
  class="w-full aspect-video rounded-lg border border-gray-700"
  loading="lazy"
  sandbox="allow-scripts allow-same-origin"
  allowfullscreen
></iframe>

## Closing

The system is live at `documentos.facet.unt.edu.ar`. Zero licensing cost, full data sovereignty, integrated with the faculty's existing Google Workspace accounts.

The faculty processes documents on it daily. Administrative resolutions, committee minutes, academic paperwork. The kind of work that used to require downloading, signing, emailing, and waiting.

The system survives its builder. That is the real test of any production deployment.
