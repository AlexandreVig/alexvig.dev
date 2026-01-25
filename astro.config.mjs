// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import vue from '@astrojs/vue';
import sitemap from '@astrojs/sitemap';
import robotsTxt from 'astro-robots-txt';

// https://astro.build/config
export default defineConfig({
  site: 'https://alexvig-dev.pages.dev', // Update with your domain
  output: 'static',
  
  vite: {
    plugins: [tailwindcss()]
  },
  
  integrations: [mdx(), vue(), sitemap(), robotsTxt()],

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});