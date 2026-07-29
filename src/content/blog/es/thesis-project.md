---
title: "Diseño, Implementación y Despliegue de un Sistema de Firma Electrónica de Documentos On-Premise para la FACET"
description: "Cómo desplegué Documenso en un Xeon de 2010 sin soporte AVX, conecté Docker a almacenamiento físico con Socat, y construí una plataforma de firma que cuesta $0/año en licencias."
image: ../../../assets/blog/thesis-project.png
date: 2026-07-29
translationKey: thesis-project
draft: false
---

FACET (Facultad de Ciencias Exactas y Tecnología, Universidad Nacional de Tucumán) tenía un flujo de firma de documentos que funcionaba así: descargar un PDF, firmarlo con una herramienta externa, enviárselo por email a la siguiente persona, esperar a que repita el proceso. Sin trazabilidad. Sin auditoría. Errores humanos en cada intercambio.

Existen soluciones comerciales. DocuSign, Adobe Sign, Dropbox Sign. El plan más viable para 20 usuarios salía $5,326 USD por año. Eso no es viable para una universidad pública en Argentina. Y la universidad ya contaba con los recursos técnicos necesarios para montar una solución open-source — servidores, almacenamiento, red. No había motivo para pagar por algo que podíamos correr nosotros mismos.

Así es como construí una alternativa por $0/año en licencias, corriendo íntegramente sobre hardware institucional.

## Por qué autogestionado

La decisión no fue ideológica. Fue práctica:

- **Costo cero en licencias.** Documenso es open-source bajo AGPL-3.0.
- **Soberanía total de datos.** Los documentos firmados nunca salen de los servidores institucionales. Para una universidad pública que maneja resoluciones administrativas, esto importa.
- **Integración con Google Workspace.** La facultad ya usa cuentas de Google. Documenso soporta Google OAuth de fábrica.

Evalué DocuSeal y Documenso en paralelo. Documenso ganó porque el control de acceso por roles, Google OAuth y la personalización de marca son gratuitos en el núcleo open-source. DocuSeal los reserva para su tier PRO.

## La arquitectura

El stack corre en tres capas:

**Capa de borde.** Un reverse proxy Nginx maneja la terminación SSL con certificados Let's Encrypt. Todo el tráfico HTTPS entrante pega primero en Nginx, que lo reenvía a la capa PaaS por HTTP plano en la red interna.

**Capa PaaS.** Coolify corre dentro de un contenedor LXC sobre Proxmox VE. Gestiona despliegues, variables de entorno y ruteo dinámico a través de una instancia interna de Traefik. Coolify me da un dashboard para redespliegues y rollbacks sin tocar archivos Docker Compose manualmente.

**Capa de servicios.** Cuatro contenedores Docker en una única bridge network:

| Contenedor  | Imagen                       | Propósito                                    |
| ----------- | ---------------------------- | -------------------------------------------- |
| documenso   | `documenso/documenso:v2.1.0` | Aplicación de firma electrónica              |
| postgres    | `postgres:17-alpine`         | Base de datos principal                      |
| browserless | `browserless/chrome`         | Chromium headless para generación de PDFs    |
| socat       | `alpine/socat`               | Bridge TCP hacia almacenamiento físico MinIO |

![Topología interna del PaaS mostrando Coolify, Traefik y el host Docker](/images/blog/thesis-project/paas-topology.png)

![Red interna Docker con los cuatro contenedores y sus conexiones](/images/blog/thesis-project/docker-network.png)

## Decisiones técnicas clave

Estos son los problemas que realmente consumieron tiempo.

### Browserless: el Chromium que faltaba

Después de completar el primer ciclo de firma de punta a punta, los documentos quedaban atrapados en estado `PENDING`. El flujo de firma funcionaba, pero el PDF final con el certificado embebido nunca se generaba.

Los logs contaban la historia:

```
internal.seal-document job failed:
Executable doesn't exist at /home/nodejs/.cache/ms-playwright/chromium_headless_shell
```

La imagen Docker de Documenso no incluye Chromium. Pero la generación del PDF del certificado de firma depende de Playwright, que necesita un browser headless para renderizar la página del certificado en un overlay PDF.

Esto no está documentado en la guía oficial de instalación. Lo encontré a través del Discord de la comunidad y los issues de GitHub [#2060](https://github.com/documenso/documenso/issues/2060) y [#1634](https://github.com/documenso/documenso/issues/1634).

La solución es desplegar `browserless/chrome` como servicio auxiliar y conectarlo vía WebSocket:

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

Después en el entorno de Documenso:

```text
NEXT_PRIVATE_BROWSERLESS_URL=ws://browserless:3000
```

Los límites de recursos importan. Chromium consume mucha memoria, y sin `MAX_CONCURRENT_SESSIONS=5`, un burst de firmas simultáneas puede matar el contenedor por OOM.

### Proxy Socat: conectando Docker al almacenamiento físico

Documenso usa una única variable de entorno para almacenamiento de objetos compatible con S3:

```text
NEXT_PRIVATE_UPLOAD_ENDPOINT=http://minio:9000
```

El problema: tanto el browser (para imágenes de branding como logos) como el backend (para PDFs firmados) deben alcanzar la misma URL. Pero el servidor MinIO vive en un TrueNAS físico fuera de la red virtual de Docker.

El browser puede alcanzarlo vía el dominio público. El backend, corriendo dentro de un contenedor Docker, no puede rutear hacia un servidor físico en la LAN sin ayuda.

La solución es un contenedor Socat que hace de puente entre la red virtual de Docker y el servidor físico TrueNAS/MinIO:

```yaml
socat:
  image: alpine/socat
  restart: unless-stopped
  command: "tcp-listen:9000,fork,reuseaddr tcp-connect:TRUENAS_IP:9000"
```

Dentro de Docker, `minio:9000` resuelve al contenedor Socat, que reenvía tráfico TCP al servidor MinIO real. El browser pega contra el dominio público, el backend contra Socat, y ambos llegan al mismo almacenamiento.

![Diagrama de flujo MinIO y Socat mostrando los caminos del browser y el backend hacia el almacenamiento de objetos](/images/blog/thesis-project/minio-flow.png)

Dos detalles de configuración adicionales que causaron problemas reales:

- **CORS en MinIO.** El browser sube imágenes de branding directamente a MinIO. Sin headers CORS que permitan el origen de Documenso, esos requests fallan silenciosamente.
- **`client_max_body_size` en Nginx.** Configurado en 50MB para la app Documenso y 75MB para el proxy de MinIO. Los PDFs firmados son más grandes que los originales porque embeben el certificado y la apariencia de la firma. Un upload de 30MB que se convierte en un PDF firmado de 52MB será rechazado por un límite de 50MB en el path de MinIO.

### Version pinning: instrucciones de CPU como restricción de despliegue

Documenso v2.2.0 y posteriores requieren instrucciones de CPU AVX/AVX2. La cadena de dependencia es: Documenso usa Sharp para procesamiento de imágenes, Sharp empaqueta libvips, y las builds recientes de libvips están compiladas con optimizaciones SIMD AVX.

El servidor de la facultad corre un Xeon E5620. Es un procesador Westmere-EP del 2010. No soporta AVX.

Lo verifiqué en el host:

```bash
lscpu | grep -i avx
# (salida vacía)
```

AVX se introdujo con Sandy Bridge en 2011. El E5620 es un año anterior.

La consecuencia: Documenso queda pinneado en v2.1.0. El contenedor crashea en el arranque con cualquier versión posterior porque el módulo nativo de Sharp intenta ejecutar instrucciones AVX que la CPU no implementa.

Sets de instrucciones de CPU como restricción de despliegue. No es algo en lo que pensás en instancias cloud modernas donde cada VM corre sobre hardware reciente. Pero en servidores institucionales con ciclos largos de amortización, es una pared real.

Esto queda documentado como deuda técnica. La migración de hardware que destraba las actualizaciones de Documenso es un proyecto separado.

### Autenticación: Google OAuth 2.0 restringido a un dominio

Los usuarios internos autentican vía Google OAuth 2.0, restringido al dominio `@herrera.unt.edu.ar`. El registro local está deshabilitado:

```text
NEXT_PUBLIC_DISABLE_SIGNUP=true
```

Cuando alguien intenta loguearse con una cuenta de Google no institucional, la capa de autorización de Google devuelve `403: org_internal` antes de que lleguen a Documenso. La restricción se aplica a nivel del proveedor de identidad, no de la aplicación.

Los firmantes externos (destinatarios de documentos) pueden tener cualquier dominio de email. No necesitan cuentas. Acceden a los documentos a través de links de firma únicos y con tiempo limitado, enviados por email.

### Firma criptográfica: certificado autofirmado

Documenso aplica una firma digital a cada PDF usando un certificado PKCS#12. El certificado se inyecta como variable de entorno en Base64, no se monta como archivo:

```text
NEXT_PRIVATE_SIGNING_PASSPHRASE=<passphrase>
NEXT_PRIVATE_SIGNING_CERT=<base64-encoded-p12>
```

Generé el certificado con OpenSSL:

```bash
openssl req -x509 -newkey rsa:2048 \
  -keyout key.pem -out cert.pem \
  -days 3650 -nodes \
  -subj "/C=AR/ST=Tucuman/L=San Miguel de Tucuman/O=UNT/OU=FACET/CN=documentos.facet.unt.edu.ar"

openssl pkcs12 -export -out cert.p12 \
  -inkey key.pem -in cert.pem
```

RSA 2048-bit, X.509 autofirmado, validez de 10 años.

Bajo la Ley 25.506, esto califica como "firma electrónica", no "firma digital". La distinción es legal, no técnica: la "firma digital" requiere un certificado emitido por un Autoridad Certificante licenciada bajo la PKI nacional. La "firma electrónica" es válida para uso administrativo interno pero no tiene el mismo peso probatorio en juicio.

Adobe Acrobat muestra "validez desconocida" al abrir documentos firmados, que es el comportamiento esperado para un certificado autofirmado. Lo que sí confirma es la integridad del documento: cualquier modificación posterior a la firma invalida la firma.

## Estrategia de backups

Tres dominios con distintos requerimientos de retención:

**PostgreSQL.** `pg_dump` diario a MinIO, retención de 30 días, cuota de 5 GB. RPO de 24 horas. La base de datos es chica (metadatos, cuentas de usuario, logs de auditoría) pero irremplazable.

**Documentos.** Política ILM de MinIO con retención de 5 años, cuota de 2 TB, Object Lock en modo governance. Una vez que un PDF firmado llega al bucket, no puede borrarse ni modificarse hasta que expire el período de retención, ni siquiera por el usuario root.

**Configuración.** `tar.gz` diario de `docker-compose.yml` y archivos `.env`, retención de 180 días. Recrear el entorno desde cero lleva horas. Restaurar desde backup lleva minutos.

La restauración de backups fue testeada antes de salir a producción. Ninguna intervención en producción es aceptable sin un backup verificado.

## Resultados de performance

Todo el stack corre dentro de un contenedor LXC con 8 GiB de RAM y 4 cores de CPU asignados desde el host Proxmox.

**Baseline** (idle, sin firmas activas): aproximadamente 397 MiB de RAM, que es el 5% de la asignación del LXC. Uso de CPU cercano a cero.

**Pico de carga** (5 operaciones de firma simultáneas): la RAM subió a 1,338 MiB, o 16.3% de la memoria disponible. Browserless llegó al 100% de CPU durante unos 60 segundos mientras renderizaba los PDFs de los certificados, después volvió al baseline.

![Uso de CPU bajo carga mostrando el pico de Browserless durante firmas simultáneas](/images/blog/thesis-project/performance-cpu.png)

![Uso de RAM bajo carga mostrando el pico en 1,338 MiB durante firmas simultáneas](/images/blog/thesis-project/performance-ram.png)

Incluso en el peor caso, el stack consumió 16.3% de la RAM disponible. El 83.7% restante es margen para los otros servicios que corren en el mismo host Proxmox.

## Lo que haría distinto

**TrueNAS es un single point of failure.** Todos los documentos firmados viven en un único servidor físico sin replicación off-site. Una falla de disco con un rebuild de RAID fallido significaría pérdida de datos. El siguiente paso es replicar el bucket de MinIO a una segunda ubicación.

**Un solo nodo de cómputo.** El host Proxmox es una sola máquina. Si se cae, se cae todo. Docker Swarm o K3s en múltiples nodos darían HA, pero eso es un proyecto de infraestructura más grande.

**La migración de hardware está bloqueando actualizaciones.** El Xeon E5620 pinnea Documenso en v2.1.0. Cada parche de seguridad y release de funcionalidad upstream es inaccesible hasta que el hardware soporte AVX. Este es el ítem más urgente del backlog.

**De autofirmado a CA licenciada.** Pasar de "firma electrónica" a "firma digital" requiere un certificado de una CA licenciada bajo la PKI nacional argentina. La implementación técnica es trivial (reemplazar el archivo `.p12`). El proceso burocrático para obtener el certificado no lo es.

## Presentación de defensa

Acá están las slides de mi defensa de tesis. Usá las flechas del teclado o desliza para navegar.

<iframe
  src="/presentacion/index.html"
  title="Presentación de defensa — Sistema de Firma Electrónica de Documentos para la FACET"
  class="w-full aspect-video rounded-lg border border-gray-700"
  loading="lazy"
  sandbox="allow-scripts allow-same-origin"
  allowfullscreen
></iframe>

## Cierre

El sistema está en producción en `documentos.facet.unt.edu.ar`. Costo cero en licencias, soberanía total de datos, integrado con las cuentas de Google Workspace que la facultad ya usa.

La facultad procesa documentos ahí a diario. Resoluciones administrativas, actas de comisión, papeleo académico. El tipo de trabajo que antes requería descargar, firmar, enviar por email y esperar.

El sistema sobrevive a su constructor. Esa es la prueba real de cualquier despliegue en producción.
