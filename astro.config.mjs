// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc'; // <-- Brought this back
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
    output: 'server',
    adapter: vercel({
        includeFiles: ['src/content/posts', 'src/content/site.json', 'public/uploads/posts'],
    }),
    integrations: [react(), markdoc(), keystatic()], // <-- Plugged the engine back in
    vite: {
      plugins: [tailwindcss()]
    }
});