---
title: "Cómo desplegué este sitio"
description: "Configuré un VPS desde cero, lo aseguré, instalé Dokploy y conecté GitHub Actions para deploys automáticos."
image: ../../../assets/blog/deploy-vps.png
date: 2026-07-19
translationKey: deploy-vps
---

Esta es la configuración exacta que usé para desplegar [fabricioblasich.com](https://fabricioblasich.com).

## El hardware

Compré un VPS en [RackNerd](https://racknerd.com) con estas especificaciones:

- 1 dirección IPv4
- 2.5 GB de RAM
- 2 núcleos de CPU
- 45 GB de disco
- 3 TB bandwidth
- Ubuntu 24.04 64-bit
- Ubicación: Nueva York

Me costó $18 USD por un año. Pagué con Bitcoin, así que no se aplicaron impuestos.

## Blindaje del VPS

Un VPS recién provisionado es un objetivo. La contraseña root por defecto es débil, y el usuario actual es root con acceso total al sistema. Así es como lo aseguré.

### Conexión por SSH y actualización de paquetes

Tu proveedor de VPS te da un usuario root, una IP pública y una contraseña. Conectate inmediatamente:

```bash
ssh root@ip
```

Lo primero que hay que hacer es actualizar todo. Los atacantes explotan vulnerabilidades conocidas en paquetes desactualizados, así que mantener todos los paquetes en sus últimas versiones cierra esos vectores de ataque antes de que cualquier otra cosa toque el servidor:

```bash
root@ubuntu:~# apt update
root@ubuntu:~# apt upgrade
```

Una actualización del kernel puede requerir un reinicio. Verificalo con:

```bash
root@ubuntu:~# ls /var/run/reboot-required
  /var/run/reboot-required
```

Si ese archivo existe, reiniciá desde el panel de control de tu proveedor de VPS.

### Cambio de la contraseña root por defecto

La contraseña que tu proveedor te envió por email está comprometida desde el momento en que salió de su bandeja de salida. Cambiala:

```bash
root@ubuntu:~# passwd
root@ubuntu:~# exit
```

Volvé a conectarte por SSH con tu nueva contraseña.

### Creación de un usuario sin privilegios root con acceso sudo

Creá un usuario regular con una contraseña fuerte (diferente a la de root) y otorgale privilegios de sudo:

```bash
root@ubuntu:~# adduser fblasich
```

Este usuario todavía no puede hacer nada como superusuario. Agregalo al grupo `sudo`:

```bash
root@ubuntu:~# usermod -aG sudo fblasich
root@ubuntu:~# groups fblasich
  fblasich : fblasich sudo
root@ubuntu:~# exit
```

Cerrá la sesión de root e iniciá sesión como el nuevo usuario:

```bash
ssh fblasich@ip
```

### Reemplazo de autenticación por contraseña con claves SSH

Las contraseñas pueden ser vulneradas por fuerza bruta. Las claves SSH no. Generá un par de claves en tu **máquina local** (no en el VPS). GitHub tiene una [guía sobre generación de claves SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent).

En Linux, la clave pública se encuentra en `/home/VOSOTROS/.ssh/id_ALGORITMO`:

```bash
cat /home/fblasich/.ssh/id_ed25519.pub
ssh-ed25519 AAAAC4NzaC1lZDI1NTE5AAAAIAuZ9+jY7MvBcehTjzc9G6bEGbME6SMi3dFJxdT7KF5F fblasich0@gmail.com
```

Copiá esa clave pública. En el VPS, creá el directorio `.ssh` con los permisos correctos y un archivo `authorized_keys`, luego pegala:

```bash
fblasich@ubuntu:~# mkdir -p ~/.ssh
fblasich@ubuntu:~# chmod 700 ~/.ssh
fblasich@ubuntu:~# nano ~/.ssh/authorized_keys
fblasich@ubuntu:~# chmod 600 ~/.ssh/authorized_keys
fblasich@ubuntu:~# exit
```

Los permisos importan acá. SSH se rehúsa a usar claves si el directorio o el archivo son legibles por otros usuarios.

Volvé a conectarte por SSH. No te va a pedir contraseña. El par de claves se encargó de la negociación.

### Desactivación del login por contraseña

Si te conectás desde múltiples máquinas, configurá una clave SSH en cada una y agregá todas las claves públicas a `authorized_keys` antes de continuar.

Editá la configuración del demonio SSH:

```bash
fblasich@ubuntu:~# sudo nano /etc/ssh/sshd_config
```

Buscá `PasswordAuthentication yes` y cambialo a `PasswordAuthentication no`. Confirmá que `PubkeyAuthentication yes` esté configurado. Guardá el archivo.

Cloud-init puede sobrescribir esto. Verificá y editá también el archivo de sobrescritura:

```bash
fblasich@ubuntu:~# sudo nano /etc/ssh/sshd_config.d/50-cloud-init.conf
```

Configurá `PasswordAuthentication no` ahí también. Reiniciá el servicio SSH:

```bash
fblasich@ubuntu:~# sudo service ssh restart
fblasich@ubuntu:~# exit
```

Probalo. Intentá iniciar sesión como root (que no tiene clave SSH configurada):

```bash
ssh root@ip
root@ip: Permission denied (publickey).
```

Tu usuario regular sigue funcionando porque tiene una clave. Todos los demás se encuentran con una puerta cerrada.

Si algo sale mal y tu clave no funciona, usá la consola VNC de tu proveedor de VPS para iniciar sesión directamente y corregir los permisos de las claves (ver los pasos de `chmod 700` y `chmod 600` arriba).

### Desactivación completa del login de root

Incluso con la autenticación por contraseña desactivada, la cuenta root sigue siendo un objetivo conocido. Eliminala de SSH por completo:

```bash
fblasich@ubuntu:~# sudo nano /etc/ssh/sshd_config
```

Buscá `# PermitRootLogin`, descomentalo, y configuralo como `PermitRootLogin no`. Guardá y reiniciá:

```bash
fblasich@ubuntu:~# sudo service ssh restart
```

Root ya no puede iniciar sesión por SSH.

### Cierre de puertos no utilizados

Mantené abiertos solo los puertos mínimos que tus servicios realmente usan. La mayoría de los proveedores de VPS vienen con los puertos 22 (SSH), 80 (HTTP) y 443 (HTTPS) ya abiertos en UFW. Verificalo con:

```bash
fblasich@ubuntu:~# sudo ufw status
```

Deberías ver esos tres puertos permitidos. Si UFW está inactivo, activalo:

```bash
fblasich@ubuntu:~# sudo ufw allow 22/tcp
fblasich@ubuntu:~# sudo ufw allow 80/tcp
fblasich@ubuntu:~# sudo ufw allow 443/tcp
fblasich@ubuntu:~# sudo ufw enable
```

El puerto 22 queda abierto por ahora. Lo vas a cerrar más adelante, después de que NetBird esté funcionando y manejando SSH por la red privada.

### Activación de actualizaciones de seguridad automáticas

Las actualizaciones manuales se olvidan. Dejá que el sistema se parchee solo:

```bash
fblasich@ubuntu:~# sudo apt install unattended-upgrades
fblasich@ubuntu:~# sudo dpkg-reconfigure unattended-upgrades
fblasich@ubuntu:~# sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
fblasich@ubuntu:~# sudo systemctl status unattended-upgrades
```

Por defecto, solo las actualizaciones de seguridad están habilitadas.

![Configuración de unattended-upgrades](/images/blog/deploy-vps/configuring_unattended-upgrades.png)

## Aislamiento de SSH detrás de una VPN privada con NetBird

En este punto el servidor está blindado, pero el puerto 22 sigue expuesto a internet. Quería cerrarlo completamente y solo permitir SSH a través de una red privada.

[NetBird](https://netbird.io) es una VPN mesh basada en WireGuard. Permite gestionar hasta 100 peers de forma gratuita. Una vez configurado, cada dispositivo en la mesh obtiene una IP privada `100.x.x.x` y puede alcanzar directamente a cualquier otro dispositivo.

### Configuración de NetBird en tu laptop

Instalá NetBird en tu máquina local e iniciá sesión. Después ejecutá:

```bash
netbird up
```

### Agregado del VPS como peer servidor

Andá al panel de control web de NetBird, hacé clic en **Add Peer** y seleccioná **Server** (no Device). Los peers de tipo servidor no expiran sus sesiones.

1. Instalá NetBird en el VPS:

```bash
curl -fsSL https://pkgs.netbird.io/install.sh | sh
```

2. Generá una setup key en el dashboard de NetBird.

3. Ejecutá en el VPS:

```bash
netbird up --setup-key SETUP_KEY
```

Verificá la conexión:

```bash
netbird status
```

Ahora podés conectarte por SSH al VPS a través de la red privada desde cualquier dispositivo en la mesh:

```bash
ssh fblasich@100.x.x.x
```

### Rotación de setup keys

Mantener la misma setup key indefinidamente es un riesgo. Rotala cada 6 a 12 meses: cerrá sesión de NetBird en el VPS, conectate por VNC (RackNerd provee acceso VNC desde el navegador), generá una nueva setup key y volvé a ejecutar `netbird up` con la nueva clave.

### Forzar todo el tráfico SSH a través de la VPN

NetBird crea el túnel seguro, pero no gestiona el firewall. Para forzar todo el tráfico SSH a través de la VPN y bloquear el acceso público, configuré UFW manualmente.

Permití tráfico entrante exclusivamente a través de la interfaz de NetBird:

```bash
sudo ufw allow in on wt0
```

Después cerrá el puerto SSH público:

```bash
sudo ufw delete allow 22/tcp
```

Cuando instalé NetBird y ejecuté `netbird up`, el demonio orquestó automáticamente un túnel WireGuard. Creó la interfaz `wt0`, manejó la criptografía y asignó la IP privada (100.81.129.137).

**La red de seguridad:** Cerrar el puerto SSH público crea un punto único de fallo. Si NetBird se cae o una actualización rompe el demonio, quedás bloqueado. Solo procedí con esta configuración estricta porque RackNerd provee acceso KVM/VNC fuera de banda a través de su panel de control. Si NetBird falla, puedo abrir la consola del navegador desde el panel de hosting y arreglar el servidor localmente.

![Panel de control de NetBird](/images/blog/deploy-vps/netbird_panel.png)

### Debugging de fallos de DNS causados por NetBird

Después de instalar NetBird, los contenedores de Docker dejaron de resolver nombres de dominio. Este es un efecto secundario de cómo NetBird gestiona el DNS en el host.

#### Síntomas

`bun install` se colgaba sin output durante los builds, tanto en Dokploy como en `docker build` manual:

```bash
docker run --rm alpine nslookup registry.npmjs.org
# connection timed out; no servers could be reached

docker run --rm oven/bun:1.3-alpine sh -c "wget ... registry.npmjs.org"
# bad address 'registry.npmjs.org'
```

#### Causa raíz

NetBird gestiona `/etc/resolv.conf` en el host, configurando el nameserver como `100.81.82.4` (una IP interna de la VPN). Docker hereda esa configuración en los contenedores. Pero los contenedores viven en la red bridge de Docker (`172.17.0.x`) y no tienen ruta hacia la red de NetBird (`100.81.x.x`). El resultado es un timeout de DNS silencioso sin mensaje de error.

#### La solución

Forzar DNS público para todos los contenedores:

```bash
echo '{"dns": ["8.8.8.8", "1.1.1.1"]}' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

#### Verificación

`nslookup registry.npmjs.org` resolvió 12 IPs. `bun install` completó: 367 paquetes en 5.84s. Los builds de Docker volvieron a funcionar.

## Dominio y HTTPS con Dokploy

Compré `fabricioblasich.com` en [Cloudflare](https://cloudflare.com) y configuré los registros A:

![Registros DNS en Cloudflare](/images/blog/deploy-vps/dns_record_cloudflare.png)

### Instalación de Dokploy

[Dokploy](https://dokploy.com) es un PaaS de código abierto que corre en tu VPS. Maneja despliegues Docker, HTTPS y reverse proxy a través de Traefik.

```bash
curl -sSL https://dokploy.com/install.sh | sh
```

Accedé al dashboard usando tu IP privada de NetBird:

```
http://100.x.x.x:3000
```

Es HTTP plano, pero es seguro porque el tráfico viaja a través del túnel WireGuard cifrado. No expongas el puerto 3000 a internet público.

### Configuración de HTTPS con Let's Encrypt

Iniciá sesión y creá una contraseña fuerte. Después andá a **Web Server Settings**.

En tu proveedor de DNS, creá un registro A apuntando `admin.tudominio` a la IP de tu servidor. Después en el dashboard de Dokploy:

- **Domain:** ingresá `admin.tudominio`
- **Let's Encrypt:** ingresá tu dirección de email real
- **HTTPS:** seleccioná Let's Encrypt como proveedor

Hacé clic en guardar. Abrí `admin.tudominio` en una nueva pestaña. Carga por HTTPS. Iniciá sesión y empezá a desplegar tus proyectos.

![Configuración de dominio en Dokploy](/images/blog/deploy-vps/domain_config_dokploy.png)

## Movimiento de los builds fuera del VPS con GitHub Actions

Dokploy puede construir imágenes Docker directamente desde tu repositorio Git, pero en un VPS con 2.5 GB de RAM no es lo ideal.

La solución es construir la imagen en la infraestructura de GitHub. El VPS solo descarga la imagen pre-compilada y la ejecuta.

### La arquitectura

```
git push a main
       │
       ▼
GitHub Actions
  ├── Build de imagen Docker
  ├── Push a ghcr.io
  ├── POST webhook → Dokploy
  └── Prune de imágenes viejas (mantiene las últimas 3)
                        │
                        ▼
                    Dokploy
  ├── Recibe webhook
  ├── Pull de imagen desde GHCR
  └── docker compose up -d
```

El VPS nunca ejecuta `bun install` ni `astro build`. Solo hace pull y ejecuta.

### Configuración del pipeline

El workflow vive en `.github/workflows/pipeline.yml` y se dispara con pushes a `main` (solo cuando cambian archivos relevantes: `src/`, `public/`, `Dockerfile`, `package.json`, `bun.lock`, `astro.config.mjs` o `tsconfig.json`) o dispatch manual.

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

      - name: Prune old GHCR images
        uses: vlaurin/action-ghcr-prune@v0.6.0
        with:
          token: ${{ secrets.GHCR_DELETE_TOKEN }}
          user: TU_USUARIO_GITHUB
          container: TU_REPO
          dry-run: false
          keep-last: 3
          prune-untagged: true
          prune-tags-unkept: true
```

### Configuración de Dokploy para hacer pull desde GHCR

En el dashboard de Dokploy:

1. **Settings > Registries:** Agregá GHCR con tu usuario de GitHub y un Personal Access Token (PAT) con scope `read:packages`.

2. **Tu servicio:** Cambiá el proveedor de "Git" a "Docker". Configurá la imagen como `ghcr.io/TU_USUARIO/TU_REPO:latest` y seleccioná el registry que acabás de crear.

3. **Copiá la URL del webhook** desde la pestaña **Deployments** del servicio.

### Secrets de GitHub

Se requieren dos secrets en **Settings > Secrets and variables > Actions** de tu repositorio:

| Secret              | Valor                                       | Propósito                          |
| ------------------- | ------------------------------------------- | ---------------------------------- |
| `DOKPLOY_WEBHOOK`   | La URL del webhook de Dokploy               | Disparar redeploy después del push |
| `GHCR_DELETE_TOKEN` | PAT con `read:packages` + `delete:packages` | Limpiar imágenes viejas de GHCR    |

`GITHUB_TOKEN` se genera automáticamente por Actions en cada ejecución. Tiene permiso `packages: write` gracias al bloque `permissions` en el workflow. Es más seguro que un PAT porque solo vive durante la duración del job.

### El docker-compose.yml

Dokploy usa este archivo para correr el contenedor:

```yaml
services:
  astro-portfolio:
    image: ghcr.io/TU_USUARIO/TU_REPO:latest
    pull_policy: always
    container_name: astro-portfolio-static
    restart: unless-stopped
    ports:
      - "127.0.0.1:8081:80"
```

El `pull_policy: always` asegura que Dokploy siempre descargue la última imagen. El binding de puerto a `127.0.0.1` significa que el contenedor solo es accesible desde localhost. Traefik (corriendo dentro de Dokploy) se encarga del reverse proxy público.

### El flujo completo

1. Hacés push a `main`
2. GitHub Actions construye la imagen Docker en su infraestructura
3. Actions pushea la imagen a `ghcr.io`
4. Actions envía un POST al webhook de Dokploy
5. Dokploy recibe el webhook, descarga la nueva imagen y recrea el contenedor
6. Actions limpia imágenes viejas de GHCR, manteniendo solo las últimas 3 versiones
7. Tu VPS nunca compiló nada. Solo descargó y ejecutó.

## Lo que tenés ahora

VPS de $18/año. Sin puertos expuestos públicamente. Actualizaciones de seguridad automáticas. SSH solo por VPN. PaaS self-hosted con HTTPS. Ahora tenés un VPS de producción completo y un PaaS listo para desplegar cualquier proyecto Docker desde su dashboard — incluyendo este portfolio, que puedo seguir actualizando e iterando.
