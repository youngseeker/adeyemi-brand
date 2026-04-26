import type { APIRoute } from 'astro';
import { and, eq, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '../../db';
import { articleReactions } from '../../db/schema';
import { runtimeStore } from '../../lib/runtimeStore';

const getIpHash = (request: Request): string => {
	const forwarded = request.headers.get('x-forwarded-for') || '';
	const realIp = request.headers.get('x-real-ip') || '';
	const ip = (forwarded.split(',')[0] || realIp || 'unknown').trim();
	return createHash('sha256').update(ip).digest('hex');
};

const ensureReactionsTable = async () => {
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS article_reactions (
			id serial PRIMARY KEY,
			slug varchar(255) NOT NULL,
			ip_hash varchar(128) NOT NULL,
			created_at timestamp DEFAULT now()
		)
	`);
	await db.execute(sql`
		CREATE UNIQUE INDEX IF NOT EXISTS article_reactions_slug_ip_unique
		ON article_reactions (slug, ip_hash)
	`);
};

const getReactionState = async (slug: string, ipHash: string) => {
	try {
		const [countRow] = await db
			.select({ count: sql<number>`count(*)` })
			.from(articleReactions)
			.where(eq(articleReactions.slug, slug));

		const [myReaction] = await db
			.select({ id: articleReactions.id })
			.from(articleReactions)
			.where(and(eq(articleReactions.slug, slug), eq(articleReactions.ipHash, ipHash)))
			.limit(1);

		return {
			likes: Number(countRow?.count || 0),
			hasLiked: Boolean(myReaction?.id),
		};
	} catch {
		return null;
	}
};

const getRuntimeReactionState = (slug: string, ipHash: string) => {
	const rows = runtimeStore.articleReactions.filter((item) => item.slug === slug);
	const hasLiked = rows.some((item) => item.ipHash === ipHash);
	return {
		likes: rows.length,
		hasLiked,
	};
};

const saveRuntimeReaction = (slug: string, ipHash: string) => {
	const existing = runtimeStore.articleReactions.find(
		(item) => item.slug === slug && item.ipHash === ipHash,
	);

	if (!existing) {
		runtimeStore.articleReactions.push({
			slug,
			ipHash,
			createdAt: new Date().toISOString(),
		});
	}

	return getRuntimeReactionState(slug, ipHash);
};

export const GET: APIRoute = async ({ request, url }) => {
	const slug = String(url.searchParams.get('slug') || '').trim();
	if (!slug) {
		return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });
	}

	const ipHash = getIpHash(request);
	let state = await getReactionState(slug, ipHash);
	if (!state) {
		try {
			await ensureReactionsTable();
			state = await getReactionState(slug, ipHash);
		} catch {
			const runtimeState = getRuntimeReactionState(slug, ipHash);
			return new Response(
				JSON.stringify({ slug, likes: runtimeState.likes, hasLiked: runtimeState.hasLiked, reactionsEnabled: true, storageMode: 'runtime' }),
				{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
			);
		}
	}

	if (!state) {
		const runtimeState = getRuntimeReactionState(slug, ipHash);
		return new Response(
			JSON.stringify({ slug, likes: runtimeState.likes, hasLiked: runtimeState.hasLiked, reactionsEnabled: true, storageMode: 'runtime' }),
			{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
		);
	}

	return new Response(
		JSON.stringify({
			slug,
			likes: state.likes,
			hasLiked: state.hasLiked,
			reactionsEnabled: true,
		}),
		{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
	);
};

export const POST: APIRoute = async ({ request }) => {
	let body: { slug?: string } = {};
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
	}

	const slug = String(body.slug || '').trim();
	if (!slug) {
		return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });
	}

	const ipHash = getIpHash(request);

	let likes = 0;

	try {
		const [existing] = await db
			.select({ id: articleReactions.id })
			.from(articleReactions)
			.where(and(eq(articleReactions.slug, slug), eq(articleReactions.ipHash, ipHash)))
			.limit(1);

		if (!existing) {
			await db.insert(articleReactions).values({ slug, ipHash });
		}

		const state = await getReactionState(slug, ipHash);
		if (!state) {
			return new Response(
				JSON.stringify({ ok: false, slug, likes: 0, hasLiked: false, reactionsEnabled: false }),
				{ status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } },
			);
		}
		likes = state.likes;
	} catch {
		const runtimeState = saveRuntimeReaction(slug, ipHash);
		return new Response(
			JSON.stringify({ ok: true, slug, likes: runtimeState.likes, hasLiked: runtimeState.hasLiked, reactionsEnabled: true, storageMode: 'runtime' }),
			{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } },
		);
	}

	return new Response(
		JSON.stringify({
			ok: true,
			slug,
			likes,
			hasLiked: true,
			reactionsEnabled: true,
		}),
		{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } },
	);
};
