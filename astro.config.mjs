// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// Project Pages deploy (no custom domain): served under a base path.
// Final URL: https://octopus-itsm.github.io/argonaut-docs/
export default defineConfig({
  site: 'https://octopus-itsm.github.io',
  base: '/argonaut-docs/',
  integrations: [
    starlight({
      title: 'Argonaut Docs',
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
