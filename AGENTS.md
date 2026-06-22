# AGENTS.md — Portfolio

AI agent instructions for Fabricio Blasich's portfolio. Personal website, content-driven, fully static (SSG). Currently single-page, planned multi-page with blog. Docker + nginx deploy.

## Tech Stack

| Layer           | Technology                                     | Version                |
| --------------- | ---------------------------------------------- | ---------------------- |
| Framework       | Astro (SSG)                                    | ^6.4.3                 |
| Styling         | Tailwind CSS v4 (CSS-first)                    | ^4.3.0                 |
| Language        | TypeScript (strict)                            | astro/tsconfigs/strict |
| Package manager | bun                                            | 1.3.13                 |
| Formatter       | Prettier + prettier-plugin-astro, -tailwindcss | 3.8.4, 0.14.1, 0.8.0   |
| Deploy          | Docker multi-stage → nginx:1.25-alpine         | —                      |
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

Data lives in `src/content/` as YAML, schemas in `src/content.config.ts`. Uses `glob()` loader (Astro 5+) and `image()` helper via schema context. Query via `getCollection()`.

- `projects/` and `experience/` — structured data in `.yml` (no prose body)
- Future `blog/` collection — use `.md`/`.mdx` (prose content), add `src/pages/blog/` routes

**image() helper gotcha:** `image()` is a schema context parameter, NOT an import from `astro:content`. Use `schema: ({ image }) => z.object({ image: image() })`. Importing from `astro:content` causes runtime error in Astro 6.

## Project Structure

```
src/
├── assets/              # Project images (PNG)
├── components/          # Feature-foldered .astro components
│   ├── header/          # Header, Navigation, ThemeIcon
│   ├── main/            # Hero, About, Main wrapper
│   │   ├── project/     # Projects section + ProjectCard, ProjectPill
│   │   └── work/        # Experience section + ExperienceItem
│   └── socialMedia/     # SocialMedia, SocialPill
├── content/             # Content collections
│   ├── projects/        # Project entries (.yml)
│   └── experience/      # Work experience entries (.yml)
├── content.config.ts    # Collection schemas (glob loader, image() helper)
├── layouts/             # BaseLayout.astro
├── pages/               # index.astro, 404.astro
└── styles/              # global.css (Tailwind v4 @theme, design tokens)
```

Feature-folder pattern: components grouped by section. Scales to multi-page (add `src/pages/blog/`, `src/components/blog/`, `src/content/blog/` when blog arrives).

## Design System

- Font: Space Mono (400, 700) via `@fontsource/space-mono`
- Brand: rose scale (`--color-brand: var(--color-rose-600)`)
- Dark mode: class-based (`@custom-variant dark`), FOUC-prevented via inline script in `<head>`
- Tokens: `@theme` for static (fonts, brand), `@theme inline` for dynamic semantic colors (surface, text, border) — `.dark` overrides propagate at runtime

### Accessibility gaps (WCAG 2.2 AA — not yet implemented)

- Focus visible: no `:focus-visible` styles — relies on browser defaults
- Reduced motion: no `prefers-reduced-motion` — `scroll-smooth` ignores user preference
- Skip link: no skip-to-content link for keyboard users
- Selection contrast: `::selection` white on rose-500 — verify 4.5:1

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

`astro`, `tailwind`, `tailwind-css-patterns`, `frontend-design`, `accessibility`, `seo`, `nodejs-backend-patterns`, `nodejs-best-practices`, `typescript-advanced-types`
