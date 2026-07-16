// Bilingual docs generator.
//
// Starlight's `docs` collection requires one file per locale (root = en,
// fr/ = French). To keep single-file bilingual authoring — same model as the
// `updates` collection — docs are written ONCE in src/content-src/docs/ and
// this integration generates the per-locale files Starlight needs:
//
//   src/content-src/docs/foo.mdx  →  src/content/docs/foo.mdx     (en)
//                                    src/content/docs/fr/foo.mdx  (fr)
//
// Authoring format:
//   - Frontmatter: any object of the exact shape { en: ..., fr: ... } is
//     replaced by the value for the target locale (works at any depth).
//   - Body: <!-- en --> / <!-- fr --> markers start language sections.
//     Content BEFORE the first marker is shared by both locales (put MDX
//     imports there). Markers may alternate; sections concatenate.
//
// src/content/docs/ is fully generated and gitignored — never edit it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load as parseYaml, dump as dumpYaml } from 'js-yaml';

const SRC_DIR = 'src/content-src/docs';
const OUT_DIR = 'src/content/docs';
const LOCALES = ['en', 'fr'];
const EXTENSIONS = ['.md', '.mdx'];

/** Replace every { en, fr } object in frontmatter data by its locale value. */
function localizeData(value, locale) {
  if (Array.isArray(value)) return value.map((v) => localizeData(v, locale));
  if (value && typeof value === 'object' && value.constructor === Object) {
    const keys = Object.keys(value);
    if (keys.length === LOCALES.length && LOCALES.every((l) => keys.includes(l))) {
      return localizeData(value[locale], locale);
    }
    return Object.fromEntries(keys.map((k) => [k, localizeData(value[k], locale)]));
  }
  return value;
}

/** Split a body on <!-- en --> / <!-- fr --> markers; pre-marker text is shared. */
function splitBody(body) {
  const tokens = body.split(/<!--\s*(en|fr)\s*-->/gi);
  const shared = tokens[0] ?? '';
  const sections = { en: '', fr: '' };
  for (let i = 1; i < tokens.length; i += 2) {
    sections[tokens[i].toLowerCase()] += tokens[i + 1] ?? '';
  }
  // A file with no marker for a locale falls back to the other language,
  // so a page never renders empty.
  for (const locale of LOCALES) {
    const other = LOCALES.find((l) => l !== locale);
    if (!sections[locale].trim()) sections[locale] = sections[other];
  }
  return Object.fromEntries(
    LOCALES.map((l) => [l, `${shared.trim()}\n\n${sections[l].trim()}`.trim()])
  );
}

function generateFile(root, relPath, logger) {
  const raw = fs.readFileSync(path.join(root, SRC_DIR, relPath), 'utf8');
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  const data = match ? parseYaml(match[1]) : {};
  const bodies = splitBody(match ? raw.slice(match[0].length) : raw);

  for (const locale of LOCALES) {
    const outRel = locale === 'en' ? relPath : path.join('fr', relPath);
    const outPath = path.join(root, OUT_DIR, outRel);
    const frontmatter = dumpYaml(localizeData(data, locale)).trimEnd();
    const banner = `# GENERATED from ${SRC_DIR}/${relPath.replace(/\\/g, '/')} — do not edit.`;
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `---\n${banner}\n${frontmatter}\n---\n\n${bodies[locale]}\n`);
  }
  logger?.info(`generated ${relPath.replace(/\\/g, '/')} (en + fr)`);
}

function removeOutputs(root, relPath) {
  for (const outRel of [relPath, path.join('fr', relPath)]) {
    fs.rmSync(path.join(root, OUT_DIR, outRel), { force: true });
  }
}

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (EXTENSIONS.includes(path.extname(entry.name))) yield p;
  }
}

function generateAll(root, logger) {
  const srcAbs = path.join(root, SRC_DIR);
  fs.rmSync(path.join(root, OUT_DIR), { recursive: true, force: true });
  for (const file of walk(srcAbs)) {
    generateFile(root, path.relative(srcAbs, file), logger);
  }
}

export default function bilingualDocs() {
  /** @type {string} */
  let root;
  return {
    name: 'bilingual-docs',
    hooks: {
      // Runs for both `astro dev` and `astro build`, before Starlight reads
      // the content directory (this integration is listed first).
      'astro:config:setup': ({ config, logger }) => {
        root = fileURLToPath(config.root);
        generateAll(root, logger);
      },
      // Regenerate on the fly while the dev server runs.
      'astro:server:setup': ({ server, logger }) => {
        const srcAbs = path.resolve(root, SRC_DIR);
        server.watcher.add(srcAbs);
        server.watcher.on('all', (event, file) => {
          const abs = path.resolve(file);
          if (!abs.startsWith(srcAbs + path.sep)) return;
          if (!EXTENSIONS.includes(path.extname(abs))) return;
          const rel = path.relative(srcAbs, abs);
          if (event === 'unlink') removeOutputs(root, rel);
          else generateFile(root, rel, logger);
        });
      },
    },
  };
}
