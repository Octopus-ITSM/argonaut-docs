import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
  // Starlight's own collection — one file per KB article (grows over time).
  // DO NOT edit src/content/docs/ directly: it is generated from the
  // single-file bilingual sources in src/content-src/docs/ by the
  // bilingual-docs integration (see integrations/bilingual-docs.mjs).
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),

  // Custom changelog collection — ONE file per update holding BOTH languages
  // (src/content/updates/*.md). Frontmatter title/description are localized
  // objects; the body is split by <!-- en --> / <!-- fr --> markers.
  // Rendered as aggregated rows on the Updates page, NOT as standalone pages.
  updates: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
    schema: z.object({
      title: z.object({ en: z.string(), fr: z.string() }),
      date: z.coerce.date(),
      description: z.object({ en: z.string(), fr: z.string() }),
      // Optional link back to the source change in another repo.
      sourcePR: z.string().url().optional(),
    }),
  }),
};
