# CI/CD Pipeline — GitHub Actions + GHCR + Dokploy

## Problema

El VPS tiene 2.4 GB de RAM. Buildear la imagen Docker ahí (bun install + astro build) compite
con Dokploy y otros containers por recursos limitados.

## Solución

Mover el build a GitHub Actions. El VPS solo baja la imagen ya compilada y la ejecuta.

## Arquitectura

```
git push a main
       │
       ▼
GitHub Actions
  ├── Build Docker image
  ├── Push a ghcr.io/archivexblasich/portfolio:latest
  └── POST webhook → Dokploy
                        │
                        ▼
                    Dokploy
  ├── Recibe webhook
  ├── Pull image de GHCR
  └── docker compose up -d
```

## Componentes

### 1. GitHub Actions — `.github/workflows/pipeline.yml`

Trigger: push a `main` o ejecución manual (`workflow_dispatch`).

Pasos:

1. **Checkout** — clona el repo
2. **Docker Buildx** — prepara BuildKit para builds eficientes
3. **Login a GHCR** — autentica con `GITHUB_TOKEN` (automático, seguro, vive solo lo que dura el job)
4. **Metadata** — genera tags: `latest` + `sha-<commit>`
5. **Build & push** — compila la imagen y la sube a GHCR
6. **Trigger Dokploy** — llama al webhook para que Dokploy redeploye

### 2. GHCR — GitHub Container Registry

Repositorio de imágenes Docker dentro de GitHub. Gratis. Las imágenes quedan en
`https://github.com/ArchivexBlasich/portfolio/pkgs/container/portfolio`.

### 3. Dokploy — Provider "Docker"

Configurado con:

- **Image:** `ghcr.io/archivexblasich/portfolio:latest`
- **Registry:** `ghcr.io`, user + PAT con scope `read:packages`

Dokploy ya no buildéa. Solo baja la imagen de GHCR y la levanta.

### 4. Webhook de Dokploy

Cada servicio en Dokploy expone una URL única que, al recibir un POST, triggera
un redeploy. Esa URL se guarda como secret `DOKPLOY_WEBHOOK` en GitHub.

## Secretos de GitHub

| Secret            | Valor                                        | Propósito              |
| ----------------- | -------------------------------------------- | ---------------------- |
| `DOKPLOY_WEBHOOK` | URL del webhook (tab Deployments en Dokploy) | Triggerear redeploy    |
| `GITHUB_TOKEN`    | Automático (no se configura)                 | Autenticar push a GHCR |

`GITHUB_TOKEN` es generado automáticamente por Actions en cada ejecución. Tiene
permiso `packages: write` gracias al bloque `permissions` del workflow. Es más
seguro que un PAT porque vive solo lo que dura el job.

## Setup paso a paso

### En Dokploy

1. **Settings > Registries:** agregar GHCR
   - Registry URL: `ghcr.io`
   - Username: `archivexblasich`
   - Password: PAT con scope `read:packages`

2. **Servicio del portfolio:** cambiar provider de "Git" a "Docker"
   - Image: `ghcr.io/archivexblasich/portfolio:latest`
   - Registry: seleccionar el creado arriba

3. **Copiar webhook URL** del servicio (tab **Deployments**)

### En GitHub

4. **Settings > Secrets and variables > Actions:**
   - `DOKPLOY_WEBHOOK` → la URL del paso 3

### En el código

5. `.github/workflows/pipeline.yml` — el pipeline (ya implementado)
6. `docker-compose.yml` — `build: .` reemplazado por `image:` + `pull_policy`

## Files de referencia

### pipeline.yml

```yaml
name: Deploy Pipeline

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=raw,value=latest,enable={{ is_default_branch }}
            type=sha,format=short

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Trigger Dokploy Deploy
        run: |
          curl -X POST "${{ secrets.DOKPLOY_WEBHOOK }}"
```

### docker-compose.yml

```yaml
services:
  astro-portfolio:
    image: ghcr.io/archivexblasich/portfolio:latest
    pull_policy: always
    container_name: astro-portfolio-static
    restart: unless-stopped
    ports:
      - "127.0.0.1:8081:80"
```

## Flujo completo

1. Hacés `git push` a `main`
2. GitHub Actions buildéa la imagen Docker (infra de GitHub, no tu VPS)
3. Actions sube la imagen a `ghcr.io/archivexblasich/portfolio:latest`
4. Actions hace POST al webhook de Dokploy
5. Dokploy recibe el webhook, baja la imagen nueva de GHCR, y recrea el container
6. El VPS nunca ejecutó `bun install` ni `astro build`, solo descargó y ejecutó
