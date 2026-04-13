import type { APIRoute } from 'astro';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { pageViewEvents, pageViews, reviews } from '../../db/schema';

export const GET: APIRoute = async () => {
	try {
		// Fetch page views data with fallback
		let viewsBySlug: Array<{ slug: string; views: number }> = [];
		try {
			viewsBySlug = await db.select({ slug: pageViews.slug, views: pageViews.views }).from(pageViews).orderBy(desc(pageViews.views));
		} catch {
			// Fallback: return empty array if page_views table unavailable
			viewsBySlug = [];
		}

		// Fetch approved feedback count
		let approvedCount = 0;
		try {
			const [approvedFeedbackCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(reviews)
				.where(eq(reviews.status, 'approved'));
			approvedCount = Number(approvedFeedbackCountRow?.count || 0);
		} catch {
			approvedCount = 0;
		}

		// Fetch pending feedback count
		let pendingCount = 0;
		try {
			const [pendingFeedbackCountRow] = await db
				.select({ count: sql<number>`count(*)` })
				.from(reviews)
				.where(eq(reviews.status, 'pending'));
			pendingCount = Number(pendingFeedbackCountRow?.count || 0);
		} catch {
			pendingCount = 0;
		}

		// Fetch rating distribution
		let ratingRows: Array<{ rating: number; count: number }> = [];
		try {
			ratingRows = await db
				.select({
					rating: sql<number>`(reviews.content::json->>'rating')::int`,
					count: sql<number>`count(*)`,
				})
				.from(reviews)
				.where(eq(reviews.status, 'approved'))
				.groupBy(sql`(reviews.content::json->>'rating')::int`)
				.orderBy(sql`(reviews.content::json->>'rating')::int desc`);
		} catch {
			ratingRows = [];
		}

		// Fetch page view events for daily breakdown
		let eventRows: Array<{ createdAt: Date | null }> = [];
		try {
			eventRows = await db.select({ createdAt: pageViewEvents.createdAt }).from(pageViewEvents).orderBy(desc(pageViewEvents.createdAt)).limit(1000);
		} catch {
			eventRows = [];
		}

		// Calculate daily views
		const now = Date.now();
		const dayMap = new Map<string, number>();
		for (let i = 13; i >= 0; i--) {
			const d = new Date(now - i * 24 * 60 * 60 * 1000);
			const key = d.toISOString().slice(0, 10);
			dayMap.set(key, 0);
		}
		eventRows.forEach((entry) => {
			if (!entry.createdAt) return;
			const key = new Date(entry.createdAt).toISOString().slice(0, 10);
			if (dayMap.has(key)) {
				dayMap.set(key, (dayMap.get(key) || 0) + 1);
			}
		});
		const dailyViews = Array.from(dayMap.entries()).map(([date, views]) => ({ date, views }));

		const totalViews = viewsBySlug.reduce((sum, entry) => sum + Number(entry.views || 0), 0);

		return new Response(
			JSON.stringify({
				totalViews,
				viewsBySlug,
				approvedFeedbackCount: approvedCount,
				pendingFeedbackCount: pendingCount,
				ratingDistribution: ratingRows,
				dailyViews,
			}),
			{
				status: 200,
				headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
			},
		);
	} catch (error) {
		// Catch-all fallback for any unexpected errors
		return new Response(
			JSON.stringify({
				error: 'Analytics unavailable',
				totalViews: 0,
				viewsBySlug: [],
				approvedFeedbackCount: 0,
				pendingFeedbackCount: 0,
				ratingDistribution: [],
				dailyViews: [],
			}),
			{
				status: 500,
				headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
			},
		);
	}
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const slug = String(body.slug || '').trim();
		if (!slug) {
			return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });
		}

		let views = 1;
		try {
			await db
				.insert(pageViews)
				.values({ slug, views: 1 })
				.onConflictDoUpdate({
					target: pageViews.slug,
					set: { views: sql`${pageViews.views} + 1` },
				});

			await db.insert(pageViewEvents).values({ slug });

			const [updated] = await db.select({ views: pageViews.views }).from(pageViews).where(eq(pageViews.slug, slug));
			views = Number(updated?.views || 1);
		} catch {
			// Silently fail: if page_views or page_view_events tables are unavailable,
			// the request is logged but the page load isn't blocked.
		}

		return new Response(JSON.stringify({ ok: true, slug, views }), {
			status: 200,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
	}
};
