import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { pageViewEvents } from '../../db/schema';
import { isPubliclyVisiblePost } from '../../lib/postVisibility';

type TrendingPost = {
	slug: string;
	title: string;
	views: number;
	source: 'analytics' | 'recent';
};

const prettyTitle = (value: string) =>
	value
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');

const formatDate = (value: unknown): string => {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return value.toISOString().slice(0, 10);
	}
	if (typeof value === 'string') return value;
	return '';
};

const getRecentPublishedPosts = async (limit = 5): Promise<TrendingPost[]> => {
	const posts = await getCollection('posts');
	return posts
		.map((post) => ({
			slug: post.id,
			title: typeof post.data.title === 'string' && post.data.title.trim() ? post.data.title.trim() : prettyTitle(post.id),
			publishedAt: formatDate(post.data.publishedAt),
			status: post.data.status,
			scheduledFor: post.data.scheduledFor,
		}))
		.filter((post) =>
			isPubliclyVisiblePost({
				status: post.status,
				scheduledFor: post.scheduledFor,
				publishedAt: post.publishedAt,
			}),
		)
		.sort((a, b) => {
			if (!a.publishedAt) return 1;
			if (!b.publishedAt) return -1;
			return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
		})
		.slice(0, limit)
		.map((post) => ({
			slug: post.slug,
			title: post.title,
			views: 0,
			source: 'recent',
		}));
};

export const GET: APIRoute = async () => {
	// Get top posts by view count in last 7 days
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	let trending: TrendingPost[] = [];

	try {
		const trendingRows = await db
			.select({
				slug: pageViewEvents.slug,
				count: sql<number>`count(*)`,
			})
			.from(pageViewEvents)
			.where(sql`${pageViewEvents.createdAt} > ${sevenDaysAgo.toISOString()}`)
			.groupBy(pageViewEvents.slug)
			.orderBy(desc(sql`count(*)`))
			.limit(5);

		trending = trendingRows.map((row) => ({
			slug: row.slug,
			title: prettyTitle(row.slug),
			views: Number(row.count || 0),
			source: 'analytics',
		}));
	} catch {
		trending = [];
	}

	if (!trending.length) {
		trending = await getRecentPublishedPosts();
	}

	return new Response(JSON.stringify({ trending }), {
		status: 200,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'max-age=300' },
	});
};
