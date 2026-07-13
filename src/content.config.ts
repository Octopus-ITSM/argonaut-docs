import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

export const collections = {
  // Starlight's own collection — one file per KB article (grows over time).
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),

  // Custom changelog collection — one file per update, per locale
  // (src/content/updates/en/*.md, src/content/updates/fr/*.md).
  // Rendered as aggregated rows on the Updates page, NOT as standalone pages.
  updates: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
    schema: z.object({
      title: z.string(),
      date: z.coerce.date(),
      description: z.string(),
      // Optional link back to the source change in another repo.
      sourcePR: z.string().url().optional(),
    }),
  }),
};
