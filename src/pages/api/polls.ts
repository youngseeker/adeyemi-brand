import type { APIRoute } from 'astro';
import { getIpHash, getPollResults, savePollVote } from '../../lib/polls';

export const GET: APIRoute = async ({ request, url }) => {
	const slug = String(url.searchParams.get('slug') || '').trim();
	if (!slug) {
		return new Response(JSON.stringify({ error: 'Missing slug' }), { status: 400 });
	}

	const ipHash = getIpHash(request);
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

export const POST: APIRoute = async ({ request }) => {
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

	const ipHash = getIpHash(request);
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