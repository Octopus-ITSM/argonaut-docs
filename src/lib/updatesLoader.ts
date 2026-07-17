import type { Loader } from 'astro/loaders';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml } from 'js-yaml';

// Custom loader for the `updates` collection. Each file groups content PER
// LANGUAGE: shared frontmatter (date) at the top, then one <!-- en --> /
// <!-- fr --> section per language, each carrying its OWN frontmatter
// (title/description/tags) directly above its body. A section is therefore a
// self-contained block that can be added or removed on its own.
//
//   ---
//   date: 2026-07-10
//   ---
//   <!-- en -->
//   ---
//   title: ...
//   description: ...
//   tags: [...]
//   ---
//   ...body...
//   <!-- fr -->
//   ---
//   title: ...
//   ---
//   ...body...
//
// The built-in glob() loader can't do this (it only parses the one top-level
// frontmatter block), so we parse and render each section here. `en` is the
// required base; other locales fall back to it at render time.
const LOCALES = ['en', 'fr'] as const;
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

/** Split a body into per-locale text on <!-- en --> / <!-- fr --> markers. */
function splitSections(body: string): Record<string, string> {
  const tokens = body.split(/<!--\s*(en|fr)\s*-->/gi);
  const sections: Record<string, string> = { en: '', fr: '' };
  for (let i = 1; i < tokens.length; i += 2) {
    sections[tokens[i].toLowerCase()] += tokens[i + 1] ?? '';
  }
  return sections;
}

/** Peel a leading `---…---` frontmatter block off a section; return meta + body. */
function parseSection(text: string): { meta: Record<string, any>; md: string } {
  const trimmed = text.replace(/^\s+/, '');
  const m = trimmed.match(FRONTMATTER);
  const meta = (m ? parseYaml(m[1]) : {}) as Record<string, any>;
  const md = (m ? trimmed.slice(m[0].length) : trimmed).trim();
  return { meta, md };
}

export function updatesLoader(): Loader {
  return {
    name: 'bilingual-updates',
    async load({ store, config, parseData, renderMarkdown, generateDigest, watcher, logger }) {
      const dir = fileURLToPath(new URL('src/content/updates/', config.root));
      const rootDir = fileURLToPath(config.root);

      async function syncFile(file: string) {
        const abs = path.join(dir, file);
        const raw = readFileSync(abs, 'utf8');
        const top = raw.match(FRONTMATTER);
        const topData = (top ? parseYaml(top[1]) : {}) as Record<string, any>;
        const sections = splitSections(top ? raw.slice(top[0].length) : raw);
        const id = file.replace(/\.md$/, '');

        // Collect authored fields (validated below) and rendered HTML per locale.
        const authored: Record<string, any> = { date: topData.date };
        const html: Record<string, string> = {};
        for (const locale of LOCALES) {
          if (!sections[locale]?.trim()) continue;
          const { meta, md } = parseSection(sections[locale]);
          authored[locale] = {
            title: meta.title,
            description: meta.description,
            tags: meta.tags ?? [],
          };
          html[locale] = (await renderMarkdown(md)).html;
        }

        // Validate authored fields against the schema (throws with a clear
        // message on a missing title/description, etc.), then attach the
        // rendered HTML the loader produced.
        const data = await parseData({ id, data: authored });
        for (const locale of LOCALES) {
          if (data[locale] && html[locale] != null) data[locale].html = html[locale];
        }

        store.set({
          id,
          data,
          filePath: path.relative(rootDir, abs).replace(/\\/g, '/'),
          digest: generateDigest(raw),
          rendered: { html: html.en ?? '' },
        });
      }

      async function syncAll() {
        store.clear();
        const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
        for (const file of files) await syncFile(file);
        return files.length;
      }

      logger.info(`loaded ${await syncAll()} update(s)`);

      // Dev: rebuild the store when any update file changes.
      if (watcher) {
        watcher.add(dir);
        watcher.on('all', async (_event, changed) => {
          const abs = path.resolve(changed);
          if (!abs.startsWith(dir) || !abs.endsWith('.md')) return;
          await syncAll();
          logger.info(`reloaded updates (${path.basename(abs)})`);
        });
      }
    },
  };
}
