# AGENTS.md — Portfolio

AI agent instructions for Fabricio Blasich's portfolio. Personal website, content-driven, fully static (SSG). Single-page landing plus a bilingual (EN/ES) blog at `/blog` and `/es/blog`. Docker + static-web-server deploy via Dokploy (Traefik edge proxy).

## Tech Stack

| Layer           | Technology                                      | Version                |
| --------------- | ----------------------------------------------- | ---------------------- |
| Framework       | Astro (SSG)                                     | ^6.4.3                 |
| Styling         | Tailwind CSS v4 (CSS-first)                     | ^4.3.0                 |
| Language        | TypeScript (strict)                             | astro/tsconfigs/strict |
| Package manager | bun                                             | 1.3.13                 |
| Formatter       | Prettier + prettier-plugin-astro, -tailwindcss  | 3.8.4, 0.14.1, 0.8.0   |
| Deploy          | Docker multi-stage → static-web-server:2-alpine | —                      |

la IA necesita el "que" y el "no hagas esto"

## Rules

**Do not:**

- Add SSR adapter or hydration islands (React/Vue/Svelte) — SSG only
- Create `tailwind.config.js`/`.ts` — use `@theme`/`@theme inline` in `global.css`
- Create hardcoded data files (`src/data/*.ts`) — content collections are the only data source
- Use `npm`, `yarn`, or `pnpm` — always `bun`
- Add AI attribution to commits (`Co-Authored-By`, `Generated with`)
- Add emojis to source code or commit messages

**Must:**

- Run `bun run format` before committing, `bun run format:check` must pass
- Pass `bun run astro check` (TypeScript strict)
- Use conventional commits (`feat:`, `fix:`, `refactor:`, `chore:`, `docs:`) in English
- English for code, identifiers, comments, UI copy (neutral/professional tone)
- Load relevant skill from `.agents/skills/` before working on matching file types

## Commands

```bash
bun install              # install deps
bun run dev              # dev server
bun run build            # production build
bun run preview          # preview built site
bun run astro check      # type checking
bun run format           # format with Prettier
bun run format:check     # check formatting
```

## Content Collections

Data lives in `src/content/` as YAML or Markdown, schemas in `src/content.config.ts`. Uses `glob()` loader (Astro 5+) and `image()` helper via schema context. Query via `getCollection()`.

- `projects/` and `experience/` — structured data in `.yml` (no prose body)
- `blog/` — prose content in `.md`. EN posts in `src/content/blog/en/<slug>.md`, ES posts in `src/content/blog/es/<slug>.md`. `translationKey` frontmatter pairs the two locales. See `docs/blog-authoring.md` for the authoring workflow. Tag routes and RSS are deferred to future slices.

**Project grouping:** Projects support an optional `group` field (string). Projects without `group` render as standalone cards at the top of the Projects section. Projects with the same `group` value collapse under a `<details>/<summary>` expand via `ProjectGroup.astro`. To add a featured/standalone project (e.g., a thesis), simply omit the `group` field in the YAML.

**image() helper gotcha:** `image()` is a schema context parameter, NOT an import from `astro:content`. Use `schema: ({ image }) => z.object({ image: image() })`. Importing from `astro:content` causes runtime error in Astro 6.

**Astro 6 idioms (do not regress):**

- `render` is a top-level named import from `astro:content`: `import { render } from "astro:content"` then `const { Content } = await render(entry)`. `entry.render()` is the Astro 5 idiom and is broken in 6.
- `ImageMetadata` type is exported from the `astro` package, NOT from `astro:assets` in Astro 6.4.3: `import type { ImageMetadata } from "astro"`.
- `getStaticPaths` predicate form: `getCollection("blog", e => e.id.startsWith("en/") && !e.data.draft)`.
- Slug derivation via regex strip on entry ID: `entry.id.replace(/^en\//, "")`. Do NOT use `entry.slug` (unreliable for glob-loader entries).

## Project Structure

```
src/
├── assets/              # Project + blog images (PNG)
├── components/          # Feature-foldered .astro components
│   ├── Button.astro     # Reusable button (primary/secondary variants)
│   ├── Link.astro       # Styled anchor link
│   ├── Strong.astro     # Styled <strong> element
│   ├── header/          # Header, Navigation, ThemeIcon, LanguageToggle
│   ├── main/            # Hero, About, Main wrapper
│   │   ├── about/       # DeployCta
│   │   ├── project/     # Projects, ProjectCard, ProjectPill, ProjectGroup
│   │   └── work/        # Experience, ExperienceItem
│   ├── blog/            # BlogCard, BlogPostLayout, PostMeta
│   └── socialMedia/     # SocialMedia, SocialPill
├── content/             # Content collections
│   ├── projects/        # Project entries (.yml)
│   │   ├── en/          # English: <slug>.yaml
│   │   └── es/          # Spanish: <slug>.yaml
│   ├── experience/      # Work experience entries (.yml)
│   └── blog/            # Blog posts (.md)
│       ├── en/          # English posts: <slug>.md
│       └── es/          # Spanish posts: <slug>.md (paired by translationKey)
├── content.config.ts    # Collection schemas (glob loader, image() helper)
├── i18n/                # ui.ts — typed EN/ES dictionary
├── layouts/             # BaseLayout.astro
├── pages/               # index.astro, 404.astro
│   ├── blog/            # EN blog: index.astro, [slug].astro
│   └── [locale]/        # ES routes (existing pattern)
│       ├── blog/        # ES blog: index.astro, [slug].astro
│       ├── index.astro
│       └── 404.astro
└── styles/              # global.css (Tailwind v4 @theme, design tokens, --tw-prose-* overrides)
```

Feature-folder pattern: components grouped by section. The blog follows this pattern: `src/components/blog/` for components, `src/content/blog/{en,es}/` for posts, `src/pages/blog/` + `src/pages/[locale]/blog/` for routes.

## Design System

- Font: Space Mono (400, 700) via `@fontsource/space-mono`
- Brand: rose scale (`--color-brand: var(--color-rose-600)`)
- Dark mode: class-based (`@custom-variant dark`), FOUC-prevented via inline script in `<head>`
- Tokens: `@theme` for static (fonts, brand), `@theme inline` for dynamic semantic colors (surface, text, border) — `.dark` overrides propagate at runtime

### Accessibility (WCAG 2.2 AA — implemented)

- Focus visible: `:focus-visible` with brand-colored outline (global.css)
- Reduced motion: `prefers-reduced-motion` media query disables animations (global.css)
- Skip link: `.skip-link` visually hidden until focused (global.css)
- Selection: `::selection` white on rose-900

## SDD Context

| Field          | Value                                     |
| -------------- | ----------------------------------------- |
| Artifact store | engram (memory-based, no files)           |
| Strict TDD     | false (no test runner)                    |
| Type checker   | `bun run astro check`                     |
| Formatter      | `bun run format` / `bun run format:check` |
| Testing        | none                                      |

Enable Strict TDD: `bun add -D vitest`, configure `vitest.config.ts`, add test scripts, re-run `sdd-init`.

## Skills

Project skills in `.agents/skills/`, registry at `.atl/skill-registry.md`:

`astro`, `tailwind`, `tailwind-css-patterns`, `frontend-design`, `accessibility`, `seo`, `nodejs-backend-patterns`, `nodejs-best-practices`, `typescript-advanced-types`, `responsive-design`, `docker-expert`
