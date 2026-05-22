import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
    schema: z.object({
        title: z.string(),
        featured: z.boolean().optional().default(false),
        coverImage: z.string().optional(),
        coverImageCredit: z.string().optional(),
        coverImageCreditUrl: z.string().url().optional(),
        publishedAt: z.coerce.date().optional(),
        scheduledFor: z.coerce.date().optional(),
        canonicalUrl: z.string().url().optional(),
        excerpt: z.string().optional(),
        author: z.string().optional(),
        tags: z.array(z.string()).optional().default([]),
        noIndex: z.boolean().optional().default(false),
        status: z.enum(['draft', 'published', 'scheduled']).optional().default('published'),
    }),
});

const devotionals = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/devotionals' }),
    schema: z.object({
        title: z.string(),
        featured: z.boolean().optional().default(false),
        scriptureRef: z.string().optional(),
        publishedAt: z.coerce.date().optional(),
        excerpt: z.string().optional(),
    }),
});

// New collection for the 31-Day Challenge
const proverbs = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/proverbs' }),
    schema: z.object({
        title: z.string(),
        day: z.number(),
        scripture: z.string(),
        tags: z.array(z.string()).optional().default([]),
    }),
});

export const collections = { posts, devotionals, proverbs };