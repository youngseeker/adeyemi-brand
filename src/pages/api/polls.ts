import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { randomUUID } from 'node:crypto';
import { renderArticleContent } from '../../lib/articleContent';
import { logAppError } from '../../lib/errorTelemetry';
import { getIpHash, getPollResults, savePollVote } from '../../lib/polls';

const POLL_VISITOR_COOKIE = 'poll_visitor_id';
const pollOptionCountCache = new Map<string, Map<string, number>>();

const getPollOptionCount = async (slug: string, pollKey: string) => {
	let slugPolls = pollOptionCountCache.get(slug);
	if (!slugPolls) {
		slugPolls = new Map<string, number>();
		const posts = await getCollection('posts');
		const post = posts.find((entry) => entry.id === slug);
		if (!post) return null;

		const rendered = renderArticleContent(post.body || '');
		for (const poll of rendered.polls) {
			slugPolls.set(poll.key, poll.options.length);
		}
		pollOptionCountCache.set(slug, slugPolls);
	}

	if (!slugPolls.has(pollKey)) return null;
	return slugPolls.get(pollKey) ?? null;
};

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
	const visitorHeaders = new Headers(request.headers);
	visitorHeaders.set('x-poll-visitor-id', visitorId);
	const ipHash = getIpHash(visitorHeaders);
	const results = await getPollResults(slug, ipHash);

	return new Response(
		JSON.stringify({
			ok: true,
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
		void logAppError({
			area: 'polls',
			code: 'poll_vote_invalid_json',
			detail: 'Vote request body could not be parsed as JSON.',
			path: '/api/polls',
		});
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
	}

	const slug = String(body.slug || '').trim();
	const pollKey = String(body.pollKey || '').trim();
	const optionIndex = Number(body.optionIndex);

	if (!slug || !pollKey || Number.isNaN(optionIndex) || optionIndex < 0) {
		return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400 });
	}

	const optionCount = await getPollOptionCount(slug, pollKey);
	if (optionCount === null) {
		return new Response(JSON.stringify({ error: 'Unknown poll' }), {
			status: 404,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	}

	if (optionIndex >= optionCount) {
		return new Response(JSON.stringify({ error: 'Invalid option index' }), {
			status: 400,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	}

	const visitorId = ensurePollVisitorId(cookies);
	const visitorHeaders = new Headers(request.headers);
	visitorHeaders.set('x-poll-visitor-id', visitorId);
	const ipHash = getIpHash(visitorHeaders);
	const result = await savePollVote({ slug, pollKey, optionIndex, ipHash });

	if (!result) {
		void logAppError({
			area: 'polls',
			code: 'poll_vote_storage_unavailable',
			detail: `Vote write returned null for ${slug}/${pollKey}.`,
			path: '/api/polls',
		});
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
