# Fabricio Blasich -- Portfolio

Personal portfolio showcasing projects, experience, and skills.

## Tech Stack

- **Astro 6** -- Static site generation (SSG)
- **Tailwind CSS v4** -- CSS-first configuration, no tailwind.config.js
- **TypeScript strict** -- Full type safety via `astro/tsconfigs/strict`
- **Docker + nginx** -- Containerised deployment on port 8081

## Project Structure

```
src/
  assets/          -- Static images (project screenshots, profile picture)
  components/
    main/          -- Page sections: Hero, About, Experience, Projects
    header/        -- Site header
    *.astro        -- Shared UI components (Button, Link, ThemeIcon, etc.)
  content/
    projects/      -- Project entries (YAML, content collection)
    experience/    -- Experience entries (YAML, content collection)
  layouts/
    BaseLayout.astro
  pages/
    index.astro    -- Single-page site
    404.astro      -- Not found page
  styles/
    global.css     -- Tailwind v4 theme, design tokens, font faces
content.config.ts  -- Content collection schemas
```

## Development

```sh
bun install
bun run dev       # Start dev server at localhost:4321
bun run build     # Build to ./dist/
bun run preview   # Preview the build locally
```

Run type and lint checks:

```sh
npx astro check
```

## Content Management

Projects are managed via YAML files in `src/content/projects/`. Each file
contains title, description, image path, tags, URLs, and ordering metadata.

Experience entries live in `src/content/experience/` using the same format.

## Docker Deploy

```sh
docker compose up -d
```

The site will be available at `http://localhost:8081`.
