// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import mdx from '@astrojs/mdx';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

/** @param {string} page */
const shouldIncludeInSitemap = (page) => {
  const pathname = new URL(page).pathname;
  const isPublish = pathname === '/publish' || pathname === '/publish/';
  const isNotFound = pathname === '/404' || pathname === '/404/';
  const isArchive = pathname === '/garden' || pathname.startsWith('/garden/') ||
    pathname === '/devotionals' || pathname.startsWith('/devotionals/');
  return !isPublish && !isNotFound && !isArchive;
};

// https://astro.build/config
export default defineConfig({
  site: 'https://adeyemiadeniji.dev',
  security: {
    allowedDomains: [
      { protocol: 'https', hostname: 'adeyemiadeniji.vercel.app' },
      { protocol: 'https', hostname: 'adeyemi-brand.vercel.app' },
    ],
  },
  output: 'server',
  adapter: vercel(),
  integrations: [mdx(), sitemap({ filter: shouldIncludeInSitemap })],
  vite: {
    plugins: [tailwindcss()],
  },
});
