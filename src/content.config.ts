import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const posts = defineCollection({
	loader: glob({ pattern: '**/*.mdoc', base: './src/content/posts' }),
	schema: z.object({
		title: z.string(),
		featured: z.boolean().optional().default(false),
		coverImage: z.string().optional(),
		publishedAt: z.coerce.date().optional(),
		canonicalUrl: z.string().url().optional(),
		noIndex: z.boolean().optional().default(false),
		excerpt: z.string().optional(),
		author: z.string().optional(),
		coverImageCredit: z.string().optional(),
		coverImageCreditUrl: z.string().url().optional(),
		tags: z.array(z.string()).optional().default([]),
		status: z.enum(['draft', 'published', 'scheduled']).optional().default('published'),
		scheduledFor: z.coerce.date().optional(),
	}),
});

export const collections = { posts };
