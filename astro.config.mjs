// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';
import markdoc from '@astrojs/markdoc';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  security: {
    allowedDomains: [
      { protocol: 'https', hostname: 'adeyemiadeniji.vercel.app' },
    ],
  },
    output: 'server',
    adapter: vercel({
      includeFiles: ['src/content/posts', 'src/content/site.json', 'public/uploads/posts'],
    }),
    integrations: [react(), markdoc(), keystatic()],
    vite: {
      // Astro and project can resolve different Vite type packages; cast avoids false-positive type mismatch.
      plugins: /** @type {any} */ ([tailwindcss()]),
    }
});