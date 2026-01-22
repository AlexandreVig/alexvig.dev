// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';

import vue from '@astrojs/vue';

// https://astro.build/config
export default defineConfig({
  site: 'https://alexvig.dev', // Update with your domain
  output: 'static',
  
  vite: {
    plugins: [tailwindcss()]
  },
  
  integrations: [mdx(), vue()],

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
      wrap: true
    }
  }
});