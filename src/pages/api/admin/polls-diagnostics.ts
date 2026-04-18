import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import { getErrorMetricsLast24h } from '../../../lib/errorTelemetry';

type PollMetrics = {
	totalVotes: number;
	votesLast24h: number;
	activePolls: number;
	activeArticles: number;
	totalErrors24h: number;
	pollErrors24h: number;
	newsletterErrors24h: number;
	topPolls24h: Array<{ slug: string; pollKey: string; votes: number }>;
	recentVotes: Array<{ slug: string; pollKey: string; optionIndex: number; createdAt: string }>;
	recentErrors: Array<{ area: string; code: string; detail: string; path: string; createdAt: string }>;
};

const defaultMetrics: PollMetrics = {
	totalVotes: 0,
	votesLast24h: 0,
	activePolls: 0,
	activeArticles: 0,
	totalErrors24h: 0,
	pollErrors24h: 0,
	newsletterErrors24h: 0,
	topPolls24h: [],
	recentVotes: [],
	recentErrors: [],
};

export const GET: APIRoute = async () => {
	let databaseConnected = false;
	let tableExists = false;
	let detail = 'Poll diagnostics are unavailable.';
	const metrics: PollMetrics = { ...defaultMetrics };

	try {
		await db.execute(sql`select 1`);
		databaseConnected = true;
	} catch {
		return new Response(
			JSON.stringify({
				ok: false,
				timestamp: new Date().toISOString(),
				databaseConnected,
				tableExists,
				detail: 'Unable to connect to database.',
				metrics,
			}),
			{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
		);
	}

	try {
		const tableResult = await db.execute(sql`select to_regclass('public.poll_votes') as regclass`);
		const tableRow = Array.isArray(tableResult) ? tableResult[0] : tableResult?.rows?.[0];
		tableExists = Boolean((tableRow as { regclass?: unknown } | undefined)?.regclass);
	} catch {
		tableExists = false;
	}

	if (!tableExists) {
		return new Response(
			JSON.stringify({
				ok: false,
				timestamp: new Date().toISOString(),
				databaseConnected,
				tableExists,
				detail: 'poll_votes table is missing. Run migrations to enable poll analytics.',
				metrics,
			}),
			{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
		);
	}

	try {
		const errorMetrics = await getErrorMetricsLast24h();
		metrics.totalErrors24h = errorMetrics.totalErrors24h;
		metrics.pollErrors24h = errorMetrics.pollErrors24h;
		metrics.newsletterErrors24h = errorMetrics.newsletterErrors24h;
		metrics.recentErrors = errorMetrics.recentErrors;

		const [totals] = await db.execute(sql`
			select
				count(*)::int as total_votes,
				count(*) filter (where created_at >= now() - interval '24 hours')::int as votes_last_24h,
				count(distinct poll_key)::int as active_polls,
				count(distinct slug)::int as active_articles
			from poll_votes
		`);

		metrics.totalVotes = Number((totals as { total_votes?: unknown })?.total_votes || 0);
		metrics.votesLast24h = Number((totals as { votes_last_24h?: unknown })?.votes_last_24h || 0);
		metrics.activePolls = Number((totals as { active_polls?: unknown })?.active_polls || 0);
		metrics.activeArticles = Number((totals as { active_articles?: unknown })?.active_articles || 0);

		const topPollRows = await db.execute(sql`
			select slug, poll_key, count(*)::int as votes
			from poll_votes
			where created_at >= now() - interval '24 hours'
			group by slug, poll_key
			order by votes desc
			limit 5
		`);
		metrics.topPolls24h = (Array.isArray(topPollRows) ? topPollRows : [])
			.map((row) => ({
				slug: String((row as { slug?: unknown }).slug || ''),
				pollKey: String((row as { poll_key?: unknown }).poll_key || ''),
				votes: Number((row as { votes?: unknown }).votes || 0),
			}))
			.filter((item) => item.slug && item.pollKey);

		const recentRows = await db.execute(sql`
			select slug, poll_key, option_index, created_at
			from poll_votes
			order by created_at desc
			limit 8
		`);
		metrics.recentVotes = (Array.isArray(recentRows) ? recentRows : [])
			.map((row) => ({
				slug: String((row as { slug?: unknown }).slug || ''),
				pollKey: String((row as { poll_key?: unknown }).poll_key || ''),
				optionIndex: Number((row as { option_index?: unknown }).option_index || 0),
				createdAt: (row as { created_at?: unknown }).created_at
					? new Date(String((row as { created_at?: unknown }).created_at)).toISOString()
					: '',
			}))
			.filter((item) => item.slug && item.pollKey);

		detail = 'Poll metrics loaded successfully.';
	} catch {
		detail = 'Poll metrics query failed. Verify poll table schema and access rights.';
	}

	return new Response(
		JSON.stringify({
			ok: databaseConnected && tableExists,
			timestamp: new Date().toISOString(),
			databaseConnected,
			tableExists,
			detail,
			metrics,
		}),
		{ status: 200, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } },
	);
};
