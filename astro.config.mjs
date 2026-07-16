// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import bilingualDocs from './integrations/bilingual-docs.mjs';

// Project Pages deploy (no custom domain): served under a base path.
// Final URL: https://octopus-itsm.github.io/argonaut-docs/
export default defineConfig({
  site: 'https://octopus-itsm.github.io',
  base: '/argonaut-docs/',
  integrations: [
    // MUST come before starlight: generates src/content/docs/ (en + fr)
    // from the single-file bilingual sources in src/content-src/docs/.
    bilingualDocs(),
    starlight({
      title: 'Argonaut Docs',
      // Brand favicon, copied from the Argonaut app (public/favicon.ico).
      favicon: '/favicon.ico',
      customCss: [
        '@fontsource/inter/400.css',
        '@fontsource/inter/500.css',
        '@fontsource/inter/600.css',
        '@fontsource/inter/700.css',
        '@fontsource/inter/800.css',
        './src/styles/theme.css',
      ],
      components: {
        // Light-only: remove the theme toggle.
        ThemeSelect: './src/components/ThemeSelect.astro',
        // Brand header with the Octopus o-mark logo.
        SiteTitle: './src/components/SiteTitle.astro',
      },
      // English is the default locale, served at the site root (no /en/ prefix).
      // French lives under /fr/.
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        fr: { label: 'Français', lang: 'fr' },
      },
      sidebar: [
        { label: 'Updates', translations: { fr: 'Nouveautés' }, link: '/' },
      ],
    }),
  ],
});
