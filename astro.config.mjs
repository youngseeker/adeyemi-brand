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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/@keystatic')) return 'keystatic-core';
            if (id.includes('node_modules/@codemirror') || id.includes('node_modules/codemirror')) return 'keystatic-editor-codemirror';
            if (id.includes('node_modules/prosemirror')) return 'keystatic-editor-prosemirror';
            if (id.includes('node_modules/slate') || id.includes('node_modules/is-hotkey')) return 'keystatic-editor-slate';
            if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) return 'react-vendor';
            return undefined;
          },
        },
      },
    },
  },
});
