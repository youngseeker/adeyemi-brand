import type { APIRoute } from 'astro';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db';
import { reviews } from '../../db/schema';
import { createHash, randomUUID } from 'node:crypto';
import { isAdminAuthorized } from '../../lib/adminAuth';
import { runtimeStore } from '../../lib/runtimeStore';
import type { FeedbackItem } from '../../lib/runtimeStore';

type FeedbackStatus = 'pending' | 'approved' | 'rejected';

type StoredReviewPayload = {
	title?: string;
	name?: string;
	rating?: number;
	parentId?: string;
	reactions?: Record<string, number>;
	comment?: string;
};

const parsePayload = (raw: string): StoredReviewPayload => {
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === 'object') {
			return parsed as StoredReviewPayload;
		}
		return { comment: raw };
	} catch {
		return { comment: raw };
	}
};

const getIpHash = (request: Request): string => {
	const forwarded = request.headers.get('x-forwarded-for') || '';
	const realIp = request.headers.get('x-real-ip') || '';
	const ip = (forwarded.split(',')[0] || realIp || 'unknown').trim();
	return createHash('sha256').update(ip).digest('hex');
};

const isAuthorized = (request: Request) => isAdminAuthorized(request);
const autoApproveReviews = String(import.meta.env.AUTO_APPROVE_REVIEWS || 'true').toLowerCase() !== 'false';

export const GET: APIRoute = async ({ request, url }) => {
	try {
		const slug = url.searchParams.get('slug') || undefined;
		const status = (url.searchParams.get('status') as FeedbackStatus | null) || 'approved';

		if (status !== 'approved' && !isAuthorized(request)) {
			return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
		}

		const whereClause = slug
			? and(eq(reviews.slug, slug), eq(reviews.status, status))
			: eq(reviews.status, status);

		let rows: Array<{
			id: number;
			slug: string;
			content: string;
			ipHash: string | null;
			status: string | null;
			createdAt: Date | null;
		}> = [];
		try {
			rows = await db
				.select()
				.from(reviews)
				.where(whereClause)
				.orderBy(desc(reviews.createdAt));
		} catch {
			// If reviews table is unavailable, return empty items
			rows = [];
		}

		const items = rows.map((row) => {
			const payload = parsePayload(row.content);
			return {
				id: String(row.id),
				slug: row.slug,
				title: payload.title || row.slug,
				name: payload.name || 'Anonymous',
				rating: Number(payload.rating || 0),
				comment: payload.comment || '',
				parentId: (payload as any).parentId || null,
				reactions: (payload as any).reactions || {},
				status: row.status || 'pending',
				createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
			};
		});

		const runtimeItems = runtimeStore.feedback.filter((item) => {
			if (item.status !== status) return false;
			if (!slug) return true;
			return item.slug === slug;
		});

		const mergedItems = [...items, ...runtimeItems].sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);

		return new Response(JSON.stringify({ items: mergedItems }), {
			status: 200,
			headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
		});
	} catch {
		return new Response(JSON.stringify({ items: [] }), {
			status: 200,
			headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
		});
	}
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const slug = String(body.slug || '').trim();
		const title = String(body.title || '').trim();
		const name = String(body.name || 'Anonymous').trim().slice(0, 60);
		const comment = String(body.comment || '').trim().slice(0, 1200);
		const parentId = body.parentId ? String(body.parentId).trim() : undefined;
		const rating = Number(body.rating || 0);

		if (!slug || !title || !comment || Number.isNaN(rating) || rating < 1 || rating > 5) {
			return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
		}

		const ipHash = getIpHash(request);
		
		// Anti-spam check: max 3 submissions within 10 minutes per IP hash
		let tooRecent = false;
		try {
			const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
			const timestamps = await db
				.select({ createdAt: reviews.createdAt })
				.from(reviews)
				.where(eq(reviews.ipHash, ipHash))
				.orderBy(desc(reviews.createdAt))
				.limit(3);
			if (timestamps.length === 3) {
				tooRecent = timestamps.every((entry) => {
					if (!entry.createdAt) return false;
					return new Date(entry.createdAt).getTime() > tenMinutesAgo;
				});
			}
		} catch {
			// If anti-spam check fails, allow the submission to proceed
			tooRecent = false;
		}

		if (!tooRecent) {
			const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
			const runtimeRecentCount = runtimeStore.feedback.filter((entry) => {
				if (entry.ipHash !== ipHash) return false;
				return new Date(entry.createdAt).getTime() > tenMinutesAgo;
			}).length;
			tooRecent = runtimeRecentCount >= 3;
		}

		if (tooRecent) {
			return new Response(
				JSON.stringify({ error: 'Too many submissions. Please wait a few minutes before posting again.' }),
				{ status: 429 },
			);
		}

		const payload: StoredReviewPayload = {
			title,
			name: name || 'Anonymous',
			rating,
			comment,
			parentId,
			reactions: {},
		};

		const nextStatus: FeedbackStatus = autoApproveReviews ? 'approved' : 'pending';

		let item: FeedbackItem = {
			id: 'pending',
			slug,
			title,
			name: payload.name || 'Anonymous',
			rating: payload.rating || 0,
			comment: payload.comment || '',
			status: nextStatus,
			createdAt: new Date().toISOString(),
		};

		try {
			const [created] = await db
				.insert(reviews)
				.values({
					slug,
					content: JSON.stringify(payload),
					ipHash,
					status: nextStatus,
				})
				.returning();

			item = {
				id: String(created.id),
				slug: created.slug,
				title,
				name: payload.name || 'Anonymous',
				rating: payload.rating || 0,
				comment: payload.comment || '',
				status: (created.status as FeedbackStatus) || nextStatus,
				createdAt: created.createdAt ? new Date(created.createdAt).toISOString() : new Date().toISOString(),
			};
		} catch {
			item = {
				id: `runtime-${randomUUID()}`,
				slug,
				title,
				name: payload.name || 'Anonymous',
				rating: payload.rating || 0,
				comment: payload.comment || '',
				status: nextStatus,
				createdAt: new Date().toISOString(),
			};

			runtimeStore.feedback.unshift({
				...item,
				ipHash,
				parentId: payload.parentId,
				reactions: payload.reactions || {},
			});
		}

		return new Response(JSON.stringify({ ok: true, item }), {
			status: 201,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
	}
};

export const PATCH: APIRoute = async ({ request }) => {
	if (!isAuthorized(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	try {
		const body = await request.json();
		const id = String(body.id || '');
		const action = String(body.action || '');
		if ((!id && action !== 'approve_all') || !['approve', 'reject', 'approve_all'].includes(action)) {
			return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
		}

		if (action === 'approve_all') {
			const slug = String(body.slug || '').trim();
			const runtimeTargets = runtimeStore.feedback.filter((entry) => entry.status === 'pending' && (!slug || entry.slug === slug));
			runtimeTargets.forEach((entry) => {
				entry.status = 'approved';
			});

			let updatedCount = runtimeTargets.length;
			try {
				if (slug) {
					const updated = await db
						.update(reviews)
						.set({ status: 'approved' })
						.where(and(eq(reviews.status, 'pending'), eq(reviews.slug, slug)))
						.returning({ id: reviews.id });
					updatedCount += updated.length;
				} else {
					const updated = await db
						.update(reviews)
						.set({ status: 'approved' })
						.where(eq(reviews.status, 'pending'))
						.returning({ id: reviews.id });
					updatedCount += updated.length;
				}
			} catch {
				// Runtime approvals already applied; DB could be unavailable.
			}

			return new Response(JSON.stringify({ ok: true, updatedCount }), {
				status: 200,
				headers: { 'content-type': 'application/json; charset=utf-8' },
			});
		}

		const nextStatus = action === 'approve' ? 'approved' : 'rejected';

		if (id.startsWith('runtime-')) {
			const runtimeIndex = runtimeStore.feedback.findIndex((entry) => entry.id === id);
			if (runtimeIndex === -1) {
				return new Response(JSON.stringify({ error: 'Feedback item not found' }), { status: 404 });
			}

			runtimeStore.feedback[runtimeIndex] = {
				...runtimeStore.feedback[runtimeIndex],
				status: nextStatus,
			};

			return new Response(JSON.stringify({ ok: true, item: runtimeStore.feedback[runtimeIndex] }), {
				status: 200,
				headers: { 'content-type': 'application/json; charset=utf-8' },
			});
		}

		const numericId = Number(id);
		if (!Number.isFinite(numericId)) {
			return new Response(JSON.stringify({ error: 'Invalid feedback id' }), { status: 400 });
		}

		let updatedRows: Array<{
			id: number;
			slug: string;
			content: string;
			ipHash: string | null;
			status: string | null;
			createdAt: Date | null;
		}> = [];

		try {
			updatedRows = await db
				.update(reviews)
				.set({ status: nextStatus })
				.where(eq(reviews.id, numericId))
				.returning();
		} catch {
			// If database update fails, return a 500 error
			return new Response(JSON.stringify({ error: 'Database unavailable' }), { status: 500 });
		}

		if (updatedRows.length === 0) {
			return new Response(JSON.stringify({ error: 'Feedback item not found' }), { status: 404 });
		}

		const updated = updatedRows[0];
		const payload = parsePayload(updated.content);
		const item = {
			id: String(updated.id),
			slug: updated.slug,
			title: payload.title || updated.slug,
			name: payload.name || 'Anonymous',
			rating: Number(payload.rating || 0),
			comment: payload.comment || '',
			status: updated.status || 'pending',
			createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : new Date().toISOString(),
		};

		return new Response(JSON.stringify({ ok: true, item }), {
			status: 200,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
	}
};
