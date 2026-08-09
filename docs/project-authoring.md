# Project Authoring Guide

How to add, configure, and maintain project entries on the portfolio landing page. Projects render in the "Projects" section as cards (`ProjectCard.astro`) or grouped under expandable panels (`ProjectGroup.astro`).

## File layout

Project entries are YAML files (`.yaml`) under `src/content/projects/`, one directory per locale:

```
src/content/projects/
├── en/          # English entries: <slug>.yaml
└── es/          # Spanish entries: <slug>.yaml
```

The filename is the collection entry ID. EN and ES versions of the same project share the same slug (e.g., `thesis.yaml` in both directories).

## Schema

Defined in `src/content.config.ts` (the `projects` collection):

```ts
const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.yaml" }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      image: image(),
      tags: z.array(z.string().min(1)).min(1),
      githubUrl: z.url().optional(),
      liveUrl: z.url().optional(),
      blogSlug: z.string().min(1).optional(),
      featured: z.boolean().default(false),
      order: z.number().int().positive().optional(),
      group: z.string().optional(),
    }),
});
```

| Field         | Type       | Required | Default | Meaning                                                                                                                                              |
| ------------- | ---------- | -------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `title`       | `string`   | yes      | —       | Project title (non-empty).                                                                                                                           |
| `description` | `string`   | yes      | —       | One-paragraph summary shown on the card.                                                                                                             |
| `image`       | `image()`  | yes      | —       | Screenshot path relative to the `.yaml` file, e.g. `../../../assets/ThesisProject.png`. The file must exist under `src/assets/`.                     |
| `tags`        | `string[]` | yes      | —       | Technology/label tags rendered as pills. At least one required.                                                                                      |
| `githubUrl`   | `url`      | no       | —       | Source code link. Renders a GitHub icon button on the card.                                                                                          |
| `liveUrl`     | `url`      | no       | —       | Live demo link. Renders a "Live Demo" button AND (if no `blogSlug`) makes the project image a clickable link to this URL.                            |
| `blogSlug`    | `string`   | no       | —       | Links the project card image to a blog post. See "Linking projects to blog posts" below.                                                             |
| `featured`    | `boolean`  | no       | `false` | Elevates the project in sort order when `order` values tie.                                                                                          |
| `order`       | `number`   | no       | —       | Sort priority (lower = first). Unset projects sort after numbered ones.                                                                              |
| `group`       | `string`   | no       | —       | Collapses projects with the same `group` value under a `<details>/<summary>` expand. Projects without `group` render as standalone cards at the top. |

## Project grouping

- Projects **without** `group` render as standalone cards at the top of the Projects section, sorted by `order` (then `featured`).
- Projects **with** the same `group` value collapse under a `<details>/<summary>` panel via `ProjectGroup.astro`. The panel title is the group name.

Use grouping for related projects (e.g., "The Odin Project" for bootcamp-style exercises). Use standalone cards for capstone/featured work (e.g., thesis).

### Group descriptions

An optional group description renders under the panel title inside the `<summary>`. Descriptions live in their own collection — `src/content/project-groups/` — so they are never tied to a specific project or its sort order:

```
src/content/project-groups/
├── en/          # English entries: <slug>.yaml
└── es/          # Spanish entries: <slug>.yaml
```

Schema (`projectGroups` collection in `src/content.config.ts`):

```ts
const projectGroups = defineCollection({
  loader: glob({ base: "./src/content/project-groups", pattern: "**/*.yaml" }),
  schema: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
  }),
});
```

| Field         | Type     | Required | Meaning                                                                           |
| ------------- | -------- | -------- | --------------------------------------------------------------------------------- |
| `name`        | `string` | yes      | Group name — must match the projects' `group` value **exactly** (case-sensitive). |
| `description` | `string` | yes      | Short description shown under the group title in the expandable panel header.     |

`Projects.astro` loads the locale's entries and joins them to groups by `name`. A group without a matching entry simply renders without a description. Example:

```yaml
# src/content/project-groups/en/odin-project.yaml
name: "The Odin Project"
description: "Here I practiced full-stack web development, building every project without AI."
```

## Linking projects to blog posts

When a project has a companion blog post (write-up, deep-dive, walkthrough), set the `blogSlug` field to the post's slug. This **takes priority over `liveUrl` for the card image link** — the image navigates to the blog post instead of opening an external demo.

### Priority logic

The project card image link is resolved in this order:

1. **`blogSlug`** → internal `<a>` to the blog post. URL pattern:
   - English: `/blog/<blogSlug>/`
   - Spanish: `/<locale>/blog/<blogSlug>/`
2. **`liveUrl`** (when no `blogSlug`) → external `<a target="_blank" rel="noopener noreferrer">` to the demo URL.
3. **Neither** → the image is static (no link wrapping).

The "Live Demo" button is always rendered when `liveUrl` is set, regardless of `blogSlug`. Only the image link changes behavior.

### Example — thesis project

```yaml
# src/content/projects/en/thesis.yaml
title: "E-Signature Platform for FACET-UNT"
liveUrl: "https://documentos.facet.unt.edu.ar"
blogSlug: thesis-project
# ...
```

```yaml
# src/content/projects/es/thesis.yaml
title: "Plataforma de Firma Electrónica para FACET-UNT"
liveUrl: "https://documentos.facet.unt.edu.ar"
blogSlug: thesis-project
# ...
```

This links the image to `/blog/thesis-project/` (EN) and `/es/blog/thesis-project/` (ES), while the "Live Demo" button still points to `https://documentos.facet.unt.edu.ar`.

### When to set blogSlug

- The blog post must exist in both EN and ES (`src/content/blog/en/<slug>.md` and `src/content/blog/es/<slug>.md`).
- The `blogSlug` value must match the filename slug (the part after `en/` or `es/` in the entry ID), NOT the `translationKey` frontmatter field — though by convention they are the same.
- If the blog post is still a draft, keep `blogSlug` unset until it ships. An unset `blogSlug` falls through to `liveUrl`, so the behavior degrades gracefully.

### Implementation

The link resolution lives in `src/components/main/project/ProjectCard.astro` (lines ~17-28):

```ts
const { blogSlug } = data;

let imageHref: string | undefined;
let imageIsExternal = false;

if (blogSlug) {
  imageHref =
    locale === "en" ? `/blog/${blogSlug}/` : `/${locale}/blog/${blogSlug}/`;
} else if (liveUrl) {
  imageHref = liveUrl;
  imageIsExternal = true;
}
```

When `imageHref` is set, both the `<Image>` and its hover overlay are wrapped in an `<a>` tag. The `:hover` overlay behavior is preserved because `group-hover` is on the parent container, not inside the link.

## Step-by-step workflow

1. **Choose a slug** — kebab-case. Same slug for both `en/` and `es/` directories.
2. **Add the screenshot** to `src/assets/<ProjectName>.png` — required.
3. **Create `src/content/projects/en/<slug>.yaml`** with all required fields.
4. **Create `src/content/projects/es/<slug>.yaml`** with translated `title` and `description`. Keep `tags`, `image`, and URLs identical.
5. **If a blog post exists** — set `blogSlug` in both locale files. The slug must match the blog post's filename slug.
6. **Choose grouping** — omit `group` for standalone cards; set the same `group` value across all projects that should collapse together.
7. **Optional group description** — create `src/content/project-groups/{en,es}/<slug>.yaml` with `name` (exactly the `group` value) and a translated `description`.
8. **Set order** — lower numbers render first. Unset projects sort after numbered ones.
9. **Verify** — run `bun run astro check && bun run format:check && bun run build` before committing.
10. **Commit** — conventional format: `feat(projects): add <slug>` or `chore(projects): update <slug>`.

## Conventions

- English for EN entry; neutral-professional Spanish for ES entry.
- `tags`, `image`, `githubUrl`, `liveUrl`, `blogSlug`, `group`, and `order` are identical across locale versions.
- Image files live under `src/assets/`. The `image` path is relative from the `.yaml` file using `../../../assets/<file>.png`.
- The `image()` helper comes from schema context, NOT from `astro:content` import. Use `schema: ({ image }) => z.object({ image: image() })`.
- `ImageMetadata` type is imported from `astro`, NOT from `astro:assets` (Astro 6.4.3 change).

## Relevant files

- `src/content.config.ts` — the `projects` and `projectGroups` collection schemas.
- `src/content/projects/{en,es}/` — project YAML entries.
- `src/content/project-groups/{en,es}/` — group metadata (name + description) joined by `name`.
- `src/components/main/project/ProjectCard.astro` — standalone card component (image link logic lives here).
- `src/components/main/project/ProjectGroup.astro` — expandable group panel.
- `src/components/main/project/Projects.astro` — section orchestrator (sorting + grouping logic).
- `src/components/main/project/ProjectPill.astro` — tag pill component.
- `src/i18n/ui.ts` — project UI strings (`projects.heading`, `projectcard.*`, `projectGroup.*`).
- `docs/blog-authoring.md` — companion guide for the blog half of the link.
