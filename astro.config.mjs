// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  security: {
    allowedDomains: [
      { protocol: 'https', hostname: 'adeyemiadeniji.vercel.app' },
    ],
  },
  output: 'server',
  adapter: vercel(),
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});