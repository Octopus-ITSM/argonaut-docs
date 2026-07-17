import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { updatesLoader } from './lib/updatesLoader';

// One language's worth of an update: title, description, and free-form tags.
// Reused for every locale block so adding a language is a one-line schema edit.
// `html` is populated by the loader from the section body — never authored.
const localizedUpdate = z.object({
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()).default([]),
  html: z.string().optional(),
});

export const collections = {
  // Starlight's own collection — one file per KB article (grows over time).
  // DO NOT edit src/content/docs/ directly: it is generated from the
  // single-file bilingual sources in src/content-src/docs/ by the
  // bilingual-docs integration (see integrations/bilingual-docs.mjs).
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),

  // Custom changelog collection — ONE file per update holding every language
  // (src/content/updates/*.md), parsed by updatesLoader (see its header for the
  // file format). Each language is a self-contained <!-- en --> / <!-- fr -->
  // section with its OWN frontmatter (title/description/tags) above its body,
  // so a language can be added or removed as one block. `date` is shared; `en`
  // is the required base and other locales fall back to it. Tags are free-form
  // strings; each English tag is slugified into a stable key (see tagSlug in
  // src/lib/updates.ts) that drives the /tags/<slug>/ routes and the pill
  // colour, and pairs positionally with the other locales' tags. Rendered as
  // aggregated rows on the Updates page, NOT standalone pages.
  updates: defineCollection({
    loader: updatesLoader(),
    schema: z.object({
      date: z.coerce.date(),
      en: localizedUpdate,
      fr: localizedUpdate.optional(),
    }),
  }),
};
