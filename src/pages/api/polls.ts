import type { APIRoute } from 'astro';
import { randomUUID } from 'node:crypto';
import { getIpHash, getPollResults, savePollVote } from '../../lib/polls';

const POLL_VISITOR_COOKIE = 'poll_visitor_id';

const ensurePollVisitorId = (cookies: Parameters<APIRoute>[0]['cookies']) => {
	const existing = cookies.get(POLL_VISITOR_COOKIE)?.value;
	if (existing && existing.trim()) return existing;

	const created = randomUUID();
	cookies.set(POLL_VISITOR_COOKIE, created, {
		httpOnly: true,
		secure: !import.meta.env.DEV,
		sameSite: 'lax',
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
	});
	return created;
};

export const GET: APIRoute = async ({ request, url, cookies }) => {
	const slug = String(url.searchParams.get('slug') || '').trim();
	if (!slug) {
		return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });
	}

	const visitorId = ensurePollVisitorId(cookies);
	const requestWithVisitor = new Request(request, {
		headers: new Headers(request.headers),
	});
	requestWithVisitor.headers.set('x-poll-visitor-id', visitorId);
	const ipHash = getIpHash(requestWithVisitor);
	const results = await getPollResults(slug, ipHash);

	return new Response(
		JSON.stringify({
			slug,
			pollsEnabled: results.enabled,
			results: results.results,
		}),
		{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
	);
};

export const POST: APIRoute = async ({ request, cookies }) => {
	let body: { slug?: string; pollKey?: string; optionIndex?: number } = {};
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
	}

	const slug = String(body.slug || '').trim();
	const pollKey = String(body.pollKey || '').trim();
	const optionIndex = Number(body.optionIndex);

	if (!slug || !pollKey || Number.isNaN(optionIndex) || optionIndex < 0) {
		return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
	}

	const visitorId = ensurePollVisitorId(cookies);
	const requestWithVisitor = new Request(request, {
		headers: new Headers(request.headers),
	});
	requestWithVisitor.headers.set('x-poll-visitor-id', visitorId);
	const ipHash = getIpHash(requestWithVisitor);
	const result = await savePollVote({ slug, pollKey, optionIndex, ipHash });

	if (!result) {
		return new Response(JSON.stringify({ ok: false, pollsEnabled: false }), {
			status: 503,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	}

	return new Response(
		JSON.stringify({
			ok: true,
			slug,
			pollKey,
			optionIndex,
			pollsEnabled: result.enabled,
			results: result.results,
		}),
		{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8' } },
	);
};