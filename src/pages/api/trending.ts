import type { APIRoute } from 'astro';
import { desc, sql } from 'drizzle-orm';
import { db } from '../../db';
import { pageViewEvents } from '../../db/schema';

export const GET: APIRoute = async () => {
	// Get top posts by view count in last 7 days
	const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
	let trending: Array<{ slug: string; views: number }> = [];

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
			views: row.count,
		}));
	} catch {
		trending = [];
	}

	return new Response(JSON.stringify({ trending }), {
		status: 200,
		headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'max-age=3600' },
	});
};
