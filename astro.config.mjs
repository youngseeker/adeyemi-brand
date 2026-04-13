// @ts-check
import { defineConfig } from 'astro/config';

import vercel from '@astrojs/vercel';
import keystatic from '@keystatic/astro';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
	output: 'server',
	adapter: vercel(),
	integrations: [react(), keystatic()],
  vite: {
    plugins: [tailwindcss()]
  }
});