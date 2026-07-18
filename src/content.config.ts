import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// ─── Projects ─────────────────────────────────────────────────────────────────
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
      featured: z.boolean().default(false),
      order: z.number().int().positive().optional(),
      group: z.string().optional(),
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

// ─── Blog ───────────────────────────────────────────────────────────────────
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

export const collections = { projects, experience, blog };
