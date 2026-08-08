# Prompt: Translate the Thesis Defense Deck to English

Use this prompt with any capable LLM to produce the English version of the Spanish defense deck, wired into the English blog post.

---

## Role

You are a senior front-end developer and a professional Spanish-to-English translator specializing in technical presentations (Reveal.js).

## Task

Translate the Spanish thesis-defense deck at `public/presentacion/index.html` into an English version saved as `public/presentacion/index.en.html`, then wire it into the English blog post.

## Hard constraints (non-negotiable)

1. **Copy, don't rewrite.** Start from the exact source file. Change ONLY user-visible text: slide copy, SVG `<text>` nodes, table cells, badge/label text, `img alt` attributes, the `<title>`, the `<html lang="en">`, and the `<aside class="notes">` speaker notes. Do NOT touch tags, classes, ids, `data-*` attributes, fragment indices/order, inline styles, CSS, or JavaScript.
2. **Same deck, same slide count.** The deck has 26 slides (progress indicator reads "1 / 26"). Do not merge, split, or reorder slides.
3. **Never translate:** product names (Documenso, DocuSeal, MinIO, Brevo, Coolify, Traefik, Proxmox VE, TrueNAS, Docker, LXC, PostgreSQL, Browserless, Socat, Nginx, Netdata, Reveal.js), institutions (FACET, UNT, DEEC), domains (`documentos.facet.unt.edu.ar`, `minio.facet.unt.edu.ar`, `@herrera.unt.edu.ar`), all code and env vars, numbers, and asset paths (`figuras/...`). Keep `Ley 25.506` as-is in the legal slide.
4. **Consistency anchors.** The English blog post (`src/content/blog/en/thesis-project.md`) mirrors this deck, so the TOC and section-break headings MUST match exactly:
   - 01 Context and Problem
   - 02 Work Objectives
   - 03 State of the Art and Platform Selection
   - 04 Infrastructure and Deployment Architecture
   - 05 Live Demonstration
   - 06 Conclusions
5. **Numbers and currency** must match the blog post formatting: "$500 USD per month", "$6,000 USD per year", "$480 USD per month", "$5,760 USD per year", "$24–25 USD per user per month". Keep every technical figure identical (397 MiB, 1,338 MiB, 16.3%, 2 TB, 18.19 TiB, 1,825 days, etc.).
6. **Tone:** professional, concise, native English. Titles in title case. No idioms, no emojis.

## Reference translations (use these where they appear)

| Spanish                                                                                         | English                                                                                             |
| ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Diseño, Implementación y Despliegue de un Sistema de Firma Electrónica On-Premise para la FACET | Design, Implementation and Deployment of an On-Premise Electronic Document Signing System for FACET |
| Defensa de Tesis                                                                                | Thesis Defense                                                                                      |
| Trabajo Final de Graduación · Ingeniería en Computación                                         | Final Degree Project · Computer Engineering                                                         |
| Tutores:                                                                                        | Advisors:                                                                                           |
| Tabla de Contenidos                                                                             | Table of Contents                                                                                   |
| Sección 0X                                                                                      | Section 0X                                                                                          |
| Proceso de firma actual en la FACET                                                             | Current signing process at FACET                                                                    |
| Problemáticas                                                                                   | Problems                                                                                            |
| ¿Por qué Documenso?                                                                             | Why Documenso?                                                                                      |
| Modelo Organizacional Alineado a la FACET                                                       | Organizational Model Aligned to FACET                                                               |
| Integraciones con Servicios Externos                                                            | Integrations with External Services                                                                 |
| Conceptos Clave de la Infraestructura                                                           | Key Infrastructure Concepts                                                                         |
| Arquitectura General                                                                            | General Architecture                                                                                |
| Stack de Documenso                                                                              | Documenso Stack                                                                                     |
| Dimensionamiento del Almacenamiento                                                             | Storage Sizing                                                                                      |
| Políticas de Backup y Retención                                                                 | Backup and Retention Policies                                                                       |
| Ensayos y Resultados                                                                            | Testing and Results                                                                                 |
| Rendimiento del Sistema                                                                         | System Performance                                                                                  |
| Demostración en Vivo                                                                            | Live Demonstration                                                                                  |
| Demo en Vivo                                                                                    | Live Demo                                                                                           |
| Conclusiones                                                                                    | Conclusions                                                                                         |
| ¿Preguntas?                                                                                     | Questions?                                                                                          |
| ¡Gracias!                                                                                       | Thank you!                                                                                          |
| ¿Firma Electrónica o Firma Digital?                                                             | Electronic Signature or Digital Signature?                                                          |
| Cumple                                                                                          | Meets                                                                                               |
| Firma Electrónica / Firma Digital                                                               | Electronic Signature / Digital Signature                                                            |
| Válida en el ámbito administrativo interno de la FACET                                          | Valid in FACET's internal administrative scope                                                      |

Also translate: "Dentro del LXC" → "Inside the LXC", "← usamos" → "← in use", "Costo x Usuario" → "Cost per user", "Límite de Envíos" → "Sending limit", "Residencia de Datos" → "Data residency", "20 Usuarios" → "20 users", "plan anual" → "annual plan", "x usuario" → "per user", "costo estimado" → "estimated cost", "sobres/año" → "envelopes/year", "Infra propia" → "Own infrastructure", "Seleccionado" → "Selected", "Gestión de Roles (RBAC)" → "Role-Based Access Control (RBAC)", "Login con Google (SSO)" → "Google login (SSO)", "Branding Personalizado" → "Custom branding", "Stack Tecnológico" → "Tech stack", "Licencia" → "License", "Base de Datos" → "Database", "Configuración" → "Configuration", "Frecuencia: diaria" → "Frequency: daily", "Contenido:" → "Content:", "Retención:" → "Retention:", "Memoria RAM" → "Memory (RAM)", "Procesador (CPU)" → "Processor (CPU)", "Asignado" → "Allocated", "Pico" → "Peak", "Libre" → "Free", "En reposo, los cuatro contenedores consumen apenas ~500 MB de RAM" → "At rest, the four containers consume only ~500 MB of RAM", "Netdata — ráfaga de 5 documentos concurrentes" → "Netdata — burst of 5 concurrent documents", "mails/día · límite Brevo" → "emails/day · Brevo limit", "÷ 6 notificaciones por trámite" → "÷ 6 notifications per procedure", "trámites/día" → "procedures/day", "crecimiento diario proyectado" → "projected daily growth", "× 1 825 días · 5 años" → "× 1,825 days · 5 years", "volumen máximo proyectado" → "projected maximum volume", "Cuota asignada en MinIO" → "Quota allocated in MinIO", "margen de seguridad ~10 %" → "safety margin ~10%", "de 18 TB" → "of 18 TB", "2 TB — cuota asignada" → "2 TB — allocated quota", "16 TB — espacio restante (TrueNAS)" → "16 TB — remaining space (TrueNAS)", "Inicio: Doc. Requerido" → "Start: Document Required", "Descargar Documento" → "Download Document", "Firmar en Herramienta Web Externa" → "Sign in External Web Tool", "Descargar Doc. Firmado" → "Download Signed Doc", "Enviar Email al Siguiente" → "Email the Next Person", "¿Todos firmaron?" → "All signed?", "Fin: Doc. Completado" → "End: Document Complete", "Carga Única" → "Single Upload", "Config. Visual" → "Visual Config", "Motor Autom." → "Automation Engine", "Salida Trazable" → "Traceable Output", "Docente / Alumno sube el PDF" → "Lecturer / Student uploads the PDF", "Firmantes y posición en PDF" → "Signers and position in PDF", "Turnos y notificaciones" → "Turns and notifications", "Doc. firmado" → "Signed doc", "Relevamiento & Selección" → "Survey & Selection", "Arquitectura & Políticas" → "Architecture & Policies", "Implementación Piloto" → "Pilot Implementation", "Documentación & Transferencia" → "Documentation & Transfer".

## Wiring step (after the translation)

Update `src/content/blog/en/thesis-project.md`:

- Change the iframe `src="/presentacion/index.html"` to `src="/presentacion/index.en.html"`.
- Keep the existing `title` attribute and the intro line ("Here are the slides from my thesis defense — use the arrow keys to navigate.").
- Do NOT touch the ES post (`src/content/blog/es/thesis-project.md`) — it keeps pointing to `/presentacion/index.es.html`.

## Verification checklist

1. Open `public/presentacion/index.en.html` in a browser: all 26 slides render with no layout overflow.
2. Navigate every slide with the arrow keys; confirm the SVG flowcharts (manual signing process, 4-step automated flow, organizational model, architecture diagram) render their text and fragments work.
3. Grep for leftover Spanish in visible text (e.g., "Sección", "Costo", "Base de Datos", "año").
4. Run `bun run format` and `bun run format:check` (Prettier) so the file passes the repo's formatting check.
5. Start the dev server (`bun run dev`) and confirm the EN blog post at `/blog/thesis-project` embeds the English deck and the ES post at `/es/blog/thesis-project` still embeds the Spanish one.
