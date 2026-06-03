import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// ─── Projects ─────────────────────────────────────────────────────────────────
const projects = defineCollection({
  loader: glob({ base: "./src/content/projects", pattern: "**/*.yaml" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    // Relative path from the YAML file to src/assets/. Resolved at component
    // level via import.meta.glob() in Phase 2.
    image: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    githubUrl: z.url().optional(),
    liveUrl: z.url().optional(),
    featured: z.boolean().default(false),
    order: z.number().int().positive().optional(),
  }),
});

// ─── Experience ───────────────────────────────────────────────────────────────
const experience = defineCollection({
  loader: glob({ base: "./src/content/experience", pattern: "**/*.yaml" }),
  schema: z.object({
    company: z.string().min(1),
    role: z.string().min(1),
    location: z.string().optional(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().optional(),
    highlights: z.array(z.string().min(1)).min(1),
  }),
});

export const collections = { projects, experience };
