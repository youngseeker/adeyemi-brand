import type { APIRoute } from 'astro';
import { runtimeStore } from '../../lib/runtimeStore';
import { createHash } from 'node:crypto';

const getIpHash = (request: Request): string => {
	const forwarded = request.headers.get('x-forwarded-for') || '';
	const realIp = request.headers.get('x-real-ip') || '';
	const ip = (forwarded.split(',')[0] || realIp || 'unknown').trim();
	return createHash('sha256').update(ip).digest('hex');
};

export const GET: APIRoute = async ({ url }) => {
	const slug = url.searchParams.get('slug') || undefined;
	// Return all comment reactions or those for a specific slug (simple filter by id prefix)
	const items = runtimeStore.commentReactions || {};
	if (!slug) {
		return new Response(JSON.stringify({ items }), { status: 200 });
	}
	const filtered = Object.fromEntries(
		Object.entries(items).filter(([key]) => key.startsWith(`${slug}#`)),
	);
	return new Response(JSON.stringify({ items: filtered }), { status: 200 });
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const commentId = String(body.commentId || '').trim();
		const type = String(body.type || 'like');
		if (!commentId) return new Response(JSON.stringify({ error: 'Missing commentId' }), { status: 400 });

		if (!runtimeStore.commentReactions) runtimeStore.commentReactions = {};
		if (!runtimeStore.commentReactions[commentId]) runtimeStore.commentReactions[commentId] = {};
		const current = runtimeStore.commentReactions[commentId][type] || 0;
		runtimeStore.commentReactions[commentId][type] = current + 1;

		return new Response(JSON.stringify({ ok: true, reactions: runtimeStore.commentReactions[commentId] }), { status: 200 });
	} catch (err) {
		return new Response(JSON.stringify({ error: 'Invalid body' }), { status: 400 });
	}
};
