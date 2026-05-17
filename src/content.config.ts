import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
    schema: z.object({
        title: z.string(),
        featured: z.boolean().optional().default(false),
        coverImage: z.string().optional(),
        publishedAt: z.coerce.date().optional(),
        canonicalUrl: z.string().url().optional(),
        excerpt: z.string().optional(),
        tags: z.array(z.string()).optional().default([]),
        status: z.enum(['draft', 'published', 'scheduled']).optional().default('published'),
    }),
});

const devotionals = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/devotionals' }),
    schema: z.object({
        title: z.string(),
        scriptureRef: z.string().optional(),
        publishedAt: z.coerce.date().optional(),
        excerpt: z.string().optional(),
    }),
});

export const collections = { posts, devotionals };