# Blog Authoring Guide

How to add a bilingual (EN/ES) blog post to the portfolio. The blog lives at `/blog` (EN) and `/es/blog` (ES). Slice 1 ships the skeleton only — zero posts, empty-state UI. This guide is the workflow for adding the first and every subsequent post.

## File layout

Posts are Markdown files (`.md`) under `src/content/blog/`, one directory per locale:

```
src/content/blog/
├── en/          # English posts: <slug>.md
└── es/          # Spanish posts: <slug>.md (paired by translationKey)
```

The **filename becomes the URL**. There is no `slug` frontmatter override — renaming the file changes the URL.

| File                                    | URL                       |
| --------------------------------------- | ------------------------- |
| `src/content/blog/en/deploy-dokploy.md` | `/blog/deploy-dokploy`    |
| `src/content/blog/es/deploy-dokploy.md` | `/es/blog/deploy-dokploy` |

The locale is derived from the path prefix (`en/` or `es/`), NOT from a frontmatter field.

## Frontmatter schema

Defined in `src/content.config.ts` (the `blog` collection). Copy this exact shape:

```ts
const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/[^_]*.md" }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      image: image(),
      date: z.coerce.date(),
      updatedDate: z.coerce.date().optional(),
      draft: z.boolean().default(false),
      translationKey: z.string().min(1),
    }),
});
```

| Field            | Type      | Required | Default | Meaning                                                                                                                              |
| ---------------- | --------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `title`          | `string`  | yes      | —       | Post title (non-empty).                                                                                                              |
| `description`    | `string`  | yes      | —       | One-line summary, shown in the card + meta.                                                                                          |
| `image`          | `image()` | yes      | —       | Hero image path relative to the `.md` file, e.g. `../../../assets/blog/deploy-dokploy.png`. The file must exist under `src/assets/`. |
| `date`           | `date`    | yes      | —       | Publish date (coerced from YAML date or string).                                                                                     |
| `updatedDate`    | `date`    | no       | —       | Last revision date; shown only when present.                                                                                         |
| `draft`          | `boolean` | no       | `false` | Excludes the post from listing AND detail routes (404 on direct access).                                                             |
| `translationKey` | `string`  | yes      | —       | Pairs the EN and ES versions of the same post; both must share the value.                                                            |

## Bilingual pairing (MANDATORY)

`translationKey` links the EN post and its ES counterpart so the LanguageToggle can switch between them. The convention is the slug itself.

```yaml
# src/content/blog/en/deploy-dokploy.md
translationKey: deploy-dokploy

# src/content/blog/es/deploy-dokploy.md
translationKey: deploy-dokploy
```

**Orphan translations break the UX silently:**

- Share the URL before the paired version exists → the LanguageToggle links to a 404.
- The build does NOT warn about orphans. There is no lint pass that detects this.

So: publish in BOTH locales with the SAME `translationKey` before sharing any URL. If you only have one locale ready, set `draft: true` (or prefix the filename with `_`) in BOTH files until the translation lands.

## Step-by-step workflow

1. **Pick a slug** — kebab-case, will become the URL. Same slug in both `en/` and `es/`.
2. **Add the hero image** to `src/assets/blog/<slug>.png` — required, no post ships without one under the current schema. Want optional hero images? That's a schema change for a future slice.
3. **Create `src/content/blog/en/<slug>.md`** with frontmatter + Markdown body.
4. **Create `src/content/blog/es/<slug>.md`** with the SAME `translationKey`, translated title/description/body, the SAME image path, and the SAME `date`.
5. **Publish** — set `draft: false` in both when ready. To hide a file from the glob loader entirely without touching frontmatter, prefix the filename with `_` (e.g. `_deploy-dokploy.md`); the `**/[^_]*.md` pattern ignores it.
6. **Preview** — `bun run dev`, then check `http://localhost:4321/blog/<slug>` and `http://localhost:4321/es/blog/<slug>`.
7. **Verify** — run `bun run astro check && bun run format:check && bun run build` before committing.
8. **Commit** — conventional format: `feat(blog): add <slug> post` or `docs(blog): add <slug> post`.

## Worked example — `deploy-dokploy`

### English

`src/content/blog/en/deploy-dokploy.md`

```markdown
---
title: "Deploy an Astro site to Dokploy behind Traefik"
description: "Ship a static Astro build to a VPS using Docker, static-web-server, and Dokploy as the Traefik-managed deploy surface."
image: ../../../assets/blog/deploy-dokploy.png
date: 2026-07-17
translationKey: deploy-dokploy
---

Dokploy wraps Traefik and docker compose so you can deploy a prebuilt static
image without hand-rolling reverse-proxy config. This walkthrough covers the
multi-stage Dockerfile, the static-web-server runtime, and the webhook that
triggers a pull on every push to main.
```

### Spanish

`src/content/blog/es/deploy-dokploy.md`

```markdown
---
title: "Desplegar un sitio Astro en Dokploy detrás de Traefik"
description: "Publica un build estático de Astro en un VPS usando Docker, static-web-server y Dokploy como superficie de despliegue gestionada por Traefik."
image: ../../../assets/blog/deploy-dokploy.png
date: 2026-07-17
translationKey: deploy-dokploy
---

Dokploy envuelve Traefik y docker compose para que puedas desplegar una imagen
estática precompilada sin configurar manualmente el reverse proxy. Esta guía
cubre el Dockerfile multi-etapa, el runtime de static-web-server y el webhook
que dispara un pull en cada push a main.
```

Note: same `image` path (points to one shared asset), same `date`, same `translationKey`.

## Schema decisions / gotchas

- **`image` is required**, not optional, in the schema. The component prop is typed `ImageMetadata` imported from the `astro` package — NOT from `astro:assets` (that export moved in Astro 6.4.3).
- **Renaming the `.md` file changes the URL** — there is no `slug` frontmatter override.
- **`draft: true`** excludes the post from both the listing route and the `[slug]` detail route (direct URL → 404).
- **`_`-prefixed files are ignored** by the glob pattern `**/[^_]*.md` — useful for half-written drafts you don't want the build to surface, without setting `draft`.
- **Empty-blog build warnings** — `bun run build` emits "blog does not exist or is empty" warnings when only `.gitkeep` files remain. Harmless; disappears once the first `.md` ships.
- **Listing sort** — the listing is ordered by `date` descending. Pick distinct dates if order between posts matters.
- **Render idiom** — use `import { render } from "astro:content"` then `const { Content } = await render(entry)`. Do NOT call `entry.render()` (Astro 5 idiom, broken in 6).
- **Tags and RSS do not exist yet.** Slice 2 brings tags + the first posts; slice 3 brings RSS once 2-3 posts exist. Do not link to `/blog/tags/<tag>` or `/blog/rss.xml` — they 404.
- **No MDX** — only `.md` is configured. MDX is a future change if components-in-prose is ever needed.

## Conventions

- English for the EN post body; neutral-professional Spanish for the ES post body (no regional slang, no voseo).
- Code identifiers, filenames, and UI strings inside posts default to English regardless of the post's locale.
- Markdown only — `.md`; MDX is not currently configured.
- Filenames are kebab-case `<slug>.md` with the SAME slug used in both `en/` and `es/`.
- The SAME `date` appears in both locale versions — pubDate is per-post, not per-locale.

## Relevant files

- `src/content.config.ts` — the `blog` collection schema (glob loader, `image()` helper).
- `src/content/blog/{en,es}/` — post files (currently only `.gitkeep`).
- `src/components/blog/` — `BlogCard.astro`, `BlogPostLayout.astro`, `PostMeta.astro`.
- `src/pages/blog/` — EN routes (`index.astro`, `[slug].astro`).
- `src/pages/[locale]/blog/` — ES routes (`index.astro`, `[slug].astro`).
- `src/i18n/ui.ts` — blog UI strings (`blog.*`, `nav.blog`).
- `src/styles/global.css` — `--tw-prose-*` overrides bound to semantic tokens.
