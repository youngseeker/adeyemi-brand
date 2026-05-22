// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://adeyemiadeniji.vercel.app', // Added for sitemap generation
  security: {
    allowedDomains: [
      { protocol: 'https', hostname: 'adeyemiadeniji.vercel.app' },
      { protocol: 'https', hostname: 'adeyemi-brand.vercel.app' },
    ],
  },
  output: 'server',
  adapter: vercel(),
  integrations: [mdx(), sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
});