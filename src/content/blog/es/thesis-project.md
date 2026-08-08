---
title: "Diseño, Implementación y Despliegue de un Sistema de Firma Electrónica de Documentos On-Premise para la FACET"
description: "Cómo desplegué Documenso en un Xeon de 2010 sin soporte AVX, conecté Docker a almacenamiento físico con Socat, y construí una plataforma de firma que cuesta $0/año en licencias."
image: ../../../assets/blog/thesis-project.png
date: 2026-07-29
translationKey: thesis-project
draft: false
---

Para mi trabajo final de grado en Ingeniería en Computación diseñé, implementé y desplegué un sistema de firma electrónica de documentos on-premise para la FACET — la Facultad de Ciencias Exactas y Tecnología de la Universidad Nacional de Tucumán (UNT). Este artículo cuenta la historia completa: el problema que motivó el trabajo, los objetivos, cómo seleccioné y desplegué la plataforma, y lo que aprendí operándola en producción.

Estas son las diapositivas de mi defensa de tesis — usa las flechas del teclado para navegar. Si querés ver la defensa completa, el directo quedó grabado en [YouTube](https://www.youtube.com/watch?v=Vhdi6vNXI-Q).

<iframe
  src="/presentacion/index.es.html"
  title="Presentación de defensa — Sistema de Firma Electrónica de Documentos para la FACET"
  class="w-full aspect-video rounded-lg border border-gray-700"
  sandbox="allow-scripts"
  allowfullscreen
  loading="lazy"
></iframe>

## Contexto y Problemática

La FACET procesa un volumen constante de documentación administrativa y académica que requiere validación y firmas de sus autoridades y de su personal docente. Históricamente, el flujo de firma fue manual y descentralizado, y funcionaba así: cuando alguien necesitaba firmar un documento, descargaba el PDF, lo firmaba con una herramienta web externa, guardaba una copia, abría el cliente de correo, adjuntaba el archivo y lo enviaba a la siguiente persona de la cadena. El ciclo se repetía por cada firmante hasta completar el documento.

Ese circuito genera cuatro problemas estructurales:

- **Tiempo administrativo.** Los firmantes invierten su tiempo en tareas repetitivas — descargar, buscar una herramienta de firma, procesar el archivo, volver a enviarlo — en lugar de realizar la acción de manera inmediata y centralizada.
- **Errores humanos.** Se pierden hilos de correos, se olvidan archivos adjuntos y, sin una guía visual clara en el documento, la gente firma en lugares incorrectos.
- **Falta de trazabilidad.** Cada firmante tiene una versión intermedia del documento en su propio dispositivo. No existe un registro centralizado que indique quién firmó ni cuándo, y nada garantiza el orden secuencial de las firmas, por lo que es difícil saber en qué etapa exacta se encuentra un trámite.
- **Almacenamiento ineficiente.** Al no existir un repositorio único, el mismo archivo se replica en decenas de computadoras y servidores de correo, ocupando espacio innecesario en todos lados.

## Objetivos del Trabajo

El objetivo general de la tesis fue diseñar, implementar y desplegar una solución "llave en mano" para la gestión y firma electrónica de documentos PDF en la facultad, incluyendo la infraestructura y los procedimientos necesarios para su operación y mantenimiento.

La propuesta reemplaza el circuito manual de siete pasos por un flujo automatizado de cuatro:

1. **Carga única.** El usuario — docente, alumno o personal de la facultad — sube el PDF al sistema una sola vez.
2. **Configuración visual.** Directamente en la interfaz web, el remitente define quiénes deben firmar y en qué lugar físico del documento va la firma de cada uno.
3. **Motor de automatización.** La plataforma se encarga del resto: notifica a cada firmante en su turno y gestiona el flujo sin intervención manual.
4. **Salida trazable.** El documento final queda firmado con un sello criptográfico, verificable por cualquiera, y almacenado en la infraestructura propia de la facultad.

Cuatro objetivos específicos guiaron el trabajo:

1. **Relevamiento y selección.** Evaluar las alternativas de código abierto mediante un estudio comparativo y elegir la solución que mejor se adapte a la organización de la facultad y a sus servicios institucionales de identidad y almacenamiento.
2. **Arquitectura y políticas.** Diseñar la arquitectura de despliegue, configurar la infraestructura de virtualización, red y almacenamiento, y definir las políticas de respaldo y retención.
3. **Implementación piloto.** Validar la solución con usuarios reales, asegurando que la herramienta responda correctamente al flujo de trabajo propuesto.
4. **Documentación y transferencia.** Elaborar el manual de mantenimiento y los procedimientos que garanticen la transferencia de conocimiento y la continuidad del servicio.

## Estado del Arte y Selección de Plataforma

El primer paso fue relevar el mercado. Las plataformas comerciales líderes — DocuSign, Dropbox Sign y Adobe Sign — se venden por suscripción por usuario, con precios de $24–25 USD por usuario por mes y límites de envíos anuales (100 sobres por usuario en DocuSign, 150 en Adobe Sign). Para apenas 20 usuarios, la opción más económica — Adobe Sign — costaría $480 USD por mes, unos $5,760 USD por año.

Ese cálculo no es viable para una universidad pública en Argentina. Y la facultad ya contaba con los recursos técnicos — servidores, almacenamiento, red — para montar una solución open-source. Una nota importante: al optar por una solución on-premise, es la propia institución la que debe garantizar la disponibilidad del servicio y la seguridad de los datos y del servicio — responsabilidades que en una SaaS se delegan al proveedor mediante un SLA (Service Level Agreement).

Eso dejó dos alternativas open source maduras, ambas distribuidas bajo AGPL-3.0 y ambas autohospedables: <a href="https://github.com/documenso/documenso" target="_blank" rel="noopener noreferrer"><strong>Documenso</strong></a> (TypeScript, Remix + Prisma, PostgreSQL) y <a href="https://github.com/docusealco/docuseal" target="_blank" rel="noopener noreferrer"><strong>DocuSeal</strong></a> (Ruby on Rails + Vue.js, PostgreSQL). Luego de probar ambos sistemas en local, llegué a las siguientes conclusiones:

| Característica              | Documenso (Community) | DocuSeal (Community)                      |
| --------------------------- | --------------------- | ----------------------------------------- |
| Gestión de roles (RBAC)     | Incluida              | Bloqueada detrás de la edición Enterprise |
| Inicio de sesión con Google | Incluido              | Bloqueado detrás de la edición Enterprise |
| Branding personalizado      | Incluido              | Bloqueado detrás de la edición Enterprise |
| Licencia                    | AGPL-3.0              | AGPL-3.0                                  |

Sin RBAC, todos los usuarios creados en la edición comunitaria de DocuSeal tienen privilegios de administrador por defecto — un problema de seguridad que la hace inviable en un entorno institucional multiusuario. Documenso, en cambio, incluye las tres funcionalidades de serie.

Más allá de la matriz de características, Documenso ganó por tres razones que se corresponden directamente con las necesidades de la facultad:

- **Identidad.** Integración nativa con Google OAuth, que vincula la plataforma con el workspace de Google de la facultad: solo los usuarios con una cuenta institucional `@herrera.unt.edu.ar` pueden iniciar sesión, sin necesidad de administrar un segundo almacén de credenciales.
- **Modelo organizacional.** Las organizaciones y equipos de Documenso mapean casi exactamente la estructura de la FACET: la facultad es la organización raíz, cada departamento (DEEC, Física, Matemática) se convierte en un equipo con su espacio de documentos aislado, y un docente que da clases en dos departamentos simplemente pertenece a ambos equipos.
- **Ecosistema de infraestructura.** Compatibilidad nativa con almacenamiento de objetos compatible con S3 (MinIO) y con servicios de relay SMTP para las notificaciones por mail.

## Infraestructura y Arquitectura de Despliegue

El despliegue está organizado en tres capas, y toda petición proveniente de internet las atraviesa todas:

**Capa de borde.** El reverse proxy perimetral Nginx de la facultad termina el SSL con certificados Let's Encrypt para `*.facet.unt.edu.ar` y reenvía el tráfico hacia la red interna. Ni la IP del servidor ni los puertos internos de Docker quedan expuestos directamente a internet.

**Capa PaaS.** <a href="https://coolify.io/" target="_blank" rel="noopener noreferrer"><strong>Coolify</strong></a> corre dentro de un contenedor LXC sobre Proxmox VE. El contenedor (Ubuntu 22.04) ya estaba aprovisionado por el área de sistemas de la facultad: 8 vCPU, 8 GiB de RAM, 50 GB de disco raíz más un volumen de 160 GB. Coolify nos permite gestionar las variables de entorno, revisar los logs del sistema, manejar los backups y ver el estado de los contenedores, además de hacer ruteo dinámico por dominio a través de Traefik, todo desde una interfaz web.

**Capa de servicios.** Cuatro contenedores Docker en la red interna:

| Contenedor  | Imagen                       | Propósito                                    |
| ----------- | ---------------------------- | -------------------------------------------- |
| documenso   | `documenso/documenso:v2.1.0` | Aplicación de firma electrónica              |
| postgres    | `postgres:17`                | Base de datos principal                      |
| browserless | `browserless/chrome`         | Chromium headless para generación de PDFs    |
| socat       | `alpine/socat`               | Bridge TCP hacia almacenamiento físico MinIO |

![Topología interna del PaaS mostrando Coolify, Traefik y el host Docker](../../../assets/blog/thesis-project/paas-topology.png)

![Red interna Docker con los cuatro contenedores y sus conexiones](../../../assets/blog/thesis-project/docker-network.png)

Ni la plantilla de Coolify ni el docker compose de la documentación de Documenso resolvieron por sí solos el entorno institucional. La configuración final surgió de combinar ambas referencias con los problemas descubiertos durante las pruebas — las cuatro decisiones siguientes son las que realmente consumieron tiempo.

### Browserless

Después de completar el primer ciclo de firma extremo a extremo, los documentos quedaban atrapados en estado `PENDING`. El flujo de firma funcionaba, pero el PDF final con el certificado embebido nunca se generaba.

Revisando los logs, encontré el error:

```
internal.seal-document job failed:
Executable doesn't exist at /home/nodejs/.cache/ms-playwright/chromium_headless_shell
```

La imagen Docker de Documenso no incluye Chromium. Pero la generación del PDF del certificado de firma depende de Playwright, que necesita un browser headless para renderizar la página del certificado en un overlay PDF. El código toma dos caminos: si `NEXT_PRIVATE_BROWSERLESS_URL` está definida, delega el renderizado a una instancia externa por WebSocket; en caso contrario, intenta usar una instalación local de Chromium que no existe en la imagen oficial.

Esto no está documentado en la guía oficial de instalación. Lo encontré a través del Discord de la comunidad y los issues de GitHub [#2060](https://github.com/documenso/documenso/issues/2060) y [#1634](https://github.com/documenso/documenso/issues/1634).

La solución es desplegar `browserless/chrome` como servicio auxiliar y conectarlo vía WebSocket:

```yaml
browserless:
  image: browserless/chrome:1.61-chrome-stable
  restart: always
  deploy:
    resources:
      limits:
        cpus: "2"
        memory: 2g
  environment:
    MAX_CONCURRENT_SESSIONS: 5
    MAX_QUEUE_LENGTH: 20
    TIMEOUT: 60000
  extra_hosts:
    - "documentos.facet.unt.edu.ar:host-gateway"
```

Después en el entorno de Documenso:

```text
NEXT_PRIVATE_BROWSERLESS_URL=ws://browserless:3000
```

Los límites de recursos importan. Cinco sesiones concurrentes de Chrome consumen un pico de aproximadamente 1.3 GB — dentro del límite de 2 GB del contenedor queda un margen del 30%. Sin `MAX_CONCURRENT_SESSIONS=5`, una ráfaga de firmas simultáneas puede agotar la memoria y hacer que el kernel mate el contenedor por OOM (out of memory).

### Proxy Socat: conectando Docker al almacenamiento físico

Documenso centraliza la configuración de su almacenamiento de objetos compatible con S3 en una única variable de entorno:

```text
NEXT_PRIVATE_UPLOAD_ENDPOINT=https://minio.facet.unt.edu.ar
```

El problema: tanto el browser (para imágenes de branding como logos) como el backend (para PDFs firmados) deben alcanzar la misma URL. Pero el servidor MinIO vive en un TrueNAS físico fuera de la red virtual de Docker. La solución fue publicar un único dominio público unificado, `minio.facet.unt.edu.ar`, y hacer que todos los caminos hacia el almacenamiento atraviesen el proxy perimetral.

Dos flujos convergen en ese dominio. El primero es directo: Documenso genera URLs prefirmadas que el browser consume directamente contra MinIO para las imágenes de branding (logos, por ejemplo). Ese flujo exigió autorizar el origen institucional `https://documentos.facet.unt.edu.ar` en la política CORS de MinIO — sin eso, el navegador bloquea esas peticiones y las imágenes no se cargan. El segundo es indirecto: para los PDFs, el browser solo habla con la API de Documenso, y es el backend quien realiza las operaciones S3.

Un contenedor Socat hace visible el MinIO físico dentro de la red de Docker: escucha en el puerto 9000 y reenvía todo el tráfico TCP hacia el servidor TrueNAS:

```yaml
socat:
  image: alpine/socat
  restart: unless-stopped
  command: "TCP4-LISTEN:9000,fork,reuseaddr TCP4:TRUENAS_IP:9000"
```

Dentro de Docker, Traefik enruta `minio.facet.unt.edu.ar` hacia el puerto 9000 del contenedor Socat. Y ese es todo el trabajo de Socat: reenvía el tráfico TCP tal como llega, hacia el puerto 9000 del MinIO real en el TrueNAS. Como el browser y el backend usan el mismo dominio público, ambos terminan hablando con la misma instancia de MinIO. Lo desplegué como proyecto independiente en Coolify, de modo que el túnel queda reutilizable para futuros servicios de la facultad.

![Diagrama de flujo MinIO y Socat mostrando los caminos del browser y el backend hacia el almacenamiento de objetos](../../../assets/blog/thesis-project/minio-flow.png)

Un detalle de configuración adicional causó un problema real: `client_max_body_size` en Nginx. Durante las pruebas iniciales, toda carga superior a 1 MB era rechazada con `413 Content Too Large` — el límite efectivo lo imponía el proxy de borde, no Documenso. La solución fue fijar 50 MB para la app Documenso y 75 MB para el path de MinIO, porque los PDFs firmados pesan más que los originales: el certificado embebido y las imágenes de las firmas de los usuarios suman tamaño, y el límite del path de MinIO se aplica sobre el archivo final, no sobre la subida.

### Versión fija: problemas con las actualizaciones

Documenso v2.2.0 y posteriores requieren instrucciones de CPU AVX/AVX2. La cadena de dependencia es: Documenso usa Sharp para procesamiento de imágenes, Sharp empaqueta libvips, y las builds recientes de libvips están compiladas con optimizaciones SIMD AVX.

El servidor de la facultad corre un Xeon E5620. Es un procesador Westmere-EP del 2010. No soporta AVX.

Lo verifiqué en el host:

```bash
lscpu | grep -i avx
# (salida vacía)
```

Cuando intenté actualizar a v2.2.0 o superior, el servicio de Documenso moría devolviendo un error 500. Revisando los logs, descubrí que el contenedor terminaba con `Illegal instruction (core dumped)` — el módulo nativo de Sharp intentaba ejecutar una instrucción AVX que la CPU no implementa. A partir de ahí revisé el Discord de la comunidad y los issues de GitHub en busca de problemas similares, y encontré la restricción documentada en el issue [#2292](https://github.com/documenso/documenso/issues/2292).

La consecuencia: Documenso queda fijado en v2.1.0. Esto queda documentado como deuda técnica: la migración de hardware que habilita las actualizaciones de Documenso es un proyecto separado.

### Autenticación: Google OAuth restringido a un dominio

Los usuarios internos autentican vía Google OAuth 2.0, restringido al dominio `@herrera.unt.edu.ar`. La aplicación OAuth está registrada como _Interna_ en Google Cloud Console, y el registro local está deshabilitado:

```text
NEXT_PUBLIC_DISABLE_SIGNUP=true
```

La restricción opera en dos niveles. Cuando alguien intenta iniciar sesión con una cuenta de Google no institucional, la capa de autorización de Google devuelve `403: org_internal` antes de que llegue a Documenso — el bloqueo ocurre en el proveedor de identidad, no en la aplicación. Y la restricción de registro también funciona del lado del servidor: una petición directa a `/signup` recibe una redirección `302` a `/signin` desde el backend.

Los firmantes externos (destinatarios de documentos) pueden tener cualquier dominio de email. No necesitan cuentas. Acceden a los documentos a través de links de firma únicos y con tiempo limitado, enviados por email.

### Firma criptográfica: certificado autofirmado

Documenso aplica una firma digital a cada PDF. La firma se aplica a nivel de plataforma: las acciones de cada firmante — trazos, textos, casillas — quedan registradas en el sistema, y cuando todos completan su intervención, el documento se sella criptográficamente bajo el certificado institucional de la instancia. Ese sellado brinda dos garantías: integridad (cualquier modificación posterior a la firma la invalida) y autenticidad (el PDF fue firmado por el titular del certificado).

El certificado es un contenedor PKCS#12 inyectado como variable de entorno codificada en Base64, no montado como archivo:

```text
NEXT_PRIVATE_SIGNING_TRANSPORT=local
NEXT_PRIVATE_SIGNING_LOCAL_FILE_CONTENTS=<base64-encoded-p12>
NEXT_PRIVATE_SIGNING_PASSPHRASE=<passphrase>
```

Generé el certificado institucional con OpenSSL:

```bash
openssl genrsa -out private.key 2048
openssl req -new -x509 -key private.key -out certificate.crt -days 3650 \
  -subj "/C=AR/ST=Tucuman/L=San Miguel de Tucuman/O=Universidad Nacional de Tucuman/OU=FACET/CN=documentos.facet.unt.edu.ar"
openssl pkcs12 -export -legacy -out certificate_facet.p12 \
  -inkey private.key -in certificate.crt
```

RSA 2048-bit, X.509 autofirmado, validez de 10 años (marzo de 2026 a marzo de 2036).

Bajo la Ley 25.506 de Argentina, esto califica como "firma electrónica", no "firma digital". La distinción es legal, no técnica: el Artículo 2 define la firma digital como un procedimiento matemático que identifica unívocamente al firmante y detecta cualquier alteración, algo que la plataforma cumple, pero el Artículo 9 exige que el certificado haya sido emitido por una Autoridad Certificante licenciada por el Estado. El nuestro es autofirmado, generado dentro de la institución. Eso convierte la salida del sistema en una firma electrónica — plenamente válida para el uso administrativo interno de la FACET. Adobe Acrobat muestra "validez desconocida" al abrir documentos firmados, que es el comportamiento esperado para un certificado autofirmado; lo que sí confirma es la integridad del documento.

### Dimensionamiento del almacenamiento

No asigné la cuota de MinIO a ojo. El cálculo parte del techo operativo real del proveedor de correo: el plan gratuito de Brevo permite 300 correos transaccionales por día. Un trámite promedio consume 6 notificaciones (invitaciones más el aviso de finalización, con un promedio de cinco firmantes), lo que fija el techo de la plataforma en 50 documentos por día. Cada trámite genera dos PDFs de ~10 MB — el original y la versión firmada — así que el crecimiento máximo de datos es de 1 GB por día.

Con una política ILM de retención de 5 años (1,825 días) — un plazo que me pareció razonable para conservar los documentos — eso proyecta 1.825 TB. Asigné una cuota estricta de 2 TB — un margen de seguridad de aproximadamente el 10% — que representa apenas el 11% de los 18.19 TiB que expone el almacenamiento TrueNAS de la facultad. El almacenamiento no es la restricción; el límite de envíos del plan de correo gratuito lo es.

### Estrategia de backups

Operar on-premise significa que la facultad asume la continuidad por completo. Organicé la preservación en tres dominios con distintos requerimientos de retención:

**PostgreSQL.** `pg_dump` diario a las 3:00 AM mediante el job de backups de Coolify, almacenado en el bucket `documenso-backup-databases` con una cuota de 5 GB. Retención ILM de 30 días con Object Lock en modo governance — nadie puede borrar ni modificar los volcados durante esa ventana, ni siquiera el usuario root. RPO de 24 horas. La restauración se ejecuta desde la interfaz de Coolify (`pg_restore --clean`) — durante la validación realicé un simulacro completo para comprobar que funciona.

**Documentos.** El bucket `documenso-prod` guarda los originales y las versiones firmadas, con la misma retención de 1,825 días, Object Lock en modo governance y una cuota de 2 TB. El Object Lock obliga a versionar el bucket, y las reglas ILM limpian los restos que dejan los borrados — sin esa limpieza, las cuotas terminarían llenándose de archivos muertos.

**Configuración.** Un script bash corre diariamente a las 4:00 AM (una hora después del volcado de la base) y empaqueta los archivos `docker-compose.yml`, incluido el certificado de firma `.p12`, y transfiere el archivo al bucket `backups-coolify` mediante `rclone`. Retención de 180 días y cuota de 100 MB. Restaurar el entorno desde un backup toma minutos; recrearlo desde cero, horas. Si el certificado se pierde, se puede generar uno nuevo; el backup existe para mantener el mismo certificado si algo le pasa al servidor de Coolify.

### Resultados de performance

Todo el stack corre dentro del contenedor LXC con 8 vCPUs y 8 GiB de RAM. Medí el consumo por contenedor con Netdata, en operación normal y bajo una ráfaga de carga controlada.

**Baseline** (idle, sin firmas activas): el stack completo consume aproximadamente 397 MiB de RAM — alrededor del 5% de la asignación — repartidos entre Documenso (~215 MiB), Browserless (~102 MiB), PostgreSQL (~77 MiB) y el proxy Socat (~2 MiB). El uso de CPU es cercano a cero, con picos puntuales de renderizado de páginas.

**Pico de carga** (5 operaciones de firma simultáneas): la ventana de actividad duró alrededor de 1 minuto 12 segundos. Browserless procesa los jobs de sellado de forma secuencial, lo que se ve como una curva escalonada de RAM — cada peldaño es un proceso de Chrome que arranca. Alcanzó un pico de 797 MiB de RAM y 100% de una vCPU (12.5% de las 8 vCPUs), y el stack total llegó a 1,338 MiB — el 16.3% de la memoria del LXC.

![Uso de CPU bajo carga mostrando el pico de Browserless durante firmas simultáneas](../../../assets/blog/thesis-project/performance-cpu.png)

![Uso de RAM bajo carga mostrando el pico en 1,338 MiB durante firmas simultáneas](../../../assets/blog/thesis-project/performance-ram.png)

Incluso en el peor caso, el stack consumió el 16.3% de la RAM disponible, dejando unos 6.7 GiB libres.

## Demostración en Vivo

El sistema está en producción en [documentos.facet.unt.edu.ar](https://documentos.facet.unt.edu.ar). Podés verificar su estado en el endpoint `/api/health`, que reporta el estado de la base de datos y del certificado de firma.

Durante mi defensa hice una demo en vivo del sistema — podés verla en [YouTube](https://www.youtube.com/watch?v=Vhdi6vNXI-Q&t=1070), a partir del minuto 17:50.

## Conclusiones

El despliegue consolidó un sistema funcional de firma electrónica sobre infraestructura institucional: Documenso como núcleo de aplicación, PostgreSQL para la persistencia transaccional, Browserless para el renderizado del certificado, MinIO como almacenamiento de objetos y el proxy Socat redirigiendo el tráfico hacia el servidor físico de almacenamiento, todo orquestado por Coolify y Traefik en un contenedor LXC sobre Proxmox. Es uno de los primeros servicios productivos desplegados íntegramente sobre la infraestructura del DEEC y eliminó el costo recurrente de licencias.

El trabajo de validación — healthchecks, ciclos de firma extremo a extremo, un simulacro de restauración y mediciones de carga — confirmó que el sistema cumple sus objetivos funcionales, de seguridad, de rendimiento y de continuidad. Y los manuales y procedimientos documentados en la tesis hacen que el servicio no dependa de mí: el sistema sobrevive a su constructor. Esa es la prueba real de cualquier despliegue en producción.

Si tengo que quedarme con algo del trabajo, es lo que aprendí. Me dio la oportunidad de operar con recursos de cómputo reales — los servidores propios de la facultad — y de resolver un problema concreto de mi facultad usando una herramienta open source. Me enseñó el proceso completo de despliegue de un sistema: lo fundamentales que son los logs para diagnosticar problemas, las métricas de Netdata para tener observabilidad y trazabilidad, y los backups con sus políticas de retención como parte central del diseño, no un accesorio. El proyecto tiene mucho para mejorar y escalar — la resiliencia es la deuda más grande — pero me dio las bases de system design que hoy aplico en cada proyecto nuevo.

### Lo que haría distinto

**TrueNAS es un punto único de falla.** Todos los documentos firmados viven en un único servidor físico sin replicación off-site. Una falla catastrófica del NAS o una corrupción severa del pool significaría la pérdida de los PDFs. El siguiente paso es la replicación cross-site de MinIO hacia una segunda ubicación o un destino compatible con S3.

**Un solo nodo de cómputo.** El host Proxmox es una sola máquina. Si se cae, se cae todo. Docker Swarm o K3s en múltiples nodos darían alta disponibilidad, pero eso es un proyecto de infraestructura más grande.

**La migración de hardware está bloqueando las actualizaciones.** El Xeon E5620 fija Documenso en v2.1.0: hasta que el hardware soporte AVX, no podemos acceder a los parches de seguridad ni a las nuevas funcionalidades. Es lo más urgente de los pendientes.

**De autofirmado a CA licenciada.** Si en el futuro la facultad quiere pasar de firma electrónica a firma digital, basta con reemplazar el certificado por uno de una CA licenciada bajo la PKI nacional argentina — la plataforma lo soporta de forma nativa.
