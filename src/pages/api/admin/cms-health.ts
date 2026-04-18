import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db } from '../../../db';

const MIN_KEYSTATIC_SECRET_LENGTH = 32;

const getRepo = () => {
	const inferredRepo = process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
		? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
		: '';
	return process.env.KEYSTATIC_GITHUB_REPO || inferredRepo || 'youngseeker/afraid-antimatter';
};

export const GET: APIRoute = async ({ url }) => {
	const isProduction = import.meta.env.PROD;
	const repo = getRepo();
	const hasRepo = Boolean(repo && repo.includes('/'));
	const hasSecret = Boolean(import.meta.env.KEYSTATIC_SECRET && import.meta.env.KEYSTATIC_SECRET.length >= MIN_KEYSTATIC_SECRET_LENGTH);
	const hasClientId = Boolean(import.meta.env.KEYSTATIC_GITHUB_CLIENT_ID);
	const hasClientSecret = Boolean(import.meta.env.KEYSTATIC_GITHUB_CLIENT_SECRET);
	const hasDatabaseUrl = Boolean(import.meta.env.DATABASE_URL);
	const callbackUrl = `${url.origin}/api/keystatic/github/oauth/callback`;

	let databaseReachable = false;
	let pollTableExists = false;
	let pollWriteHealthy = false;
	let dbDetail = 'Database check skipped.';
	let pollTableDetail = 'Poll table check skipped.';
	let pollWriteDetail = 'Poll write check skipped.';

	if (hasDatabaseUrl) {
		try {
			await db.execute(sql`select 1`);
			databaseReachable = true;
			dbDetail = 'Database connection succeeded.';
		} catch {
			dbDetail = 'Unable to connect to DATABASE_URL.';
		}

		if (databaseReachable) {
			try {
				const tableCheck = await db.execute(sql`select to_regclass('public.poll_votes') as regclass`);
				const firstRow = Array.isArray(tableCheck) ? tableCheck[0] : tableCheck?.rows?.[0];
				pollTableExists = Boolean((firstRow as { regclass?: unknown } | undefined)?.regclass);
				pollTableDetail = pollTableExists
					? 'poll_votes table is present.'
					: 'poll_votes table is missing. Run migrations to enable poll storage.';
			} catch {
				pollTableDetail = 'Unable to verify poll_votes table.';
			}

			if (pollTableExists) {
				const probeSlug = `__cms_health_probe_${Date.now()}__`;
				try {
					await db.execute(
						sql`insert into poll_votes (slug, poll_key, option_index, ip_hash) values (${probeSlug}, 'health-check', 0, 'health-check')`,
					);
					await db.execute(sql`delete from poll_votes where slug = ${probeSlug}`);
					pollWriteHealthy = true;
					pollWriteDetail = 'Poll table write/delete probe succeeded.';
				} catch {
					pollWriteDetail = 'Poll write probe failed. Verify database permissions and schema.';
				}
			}
		}
	}

	const checks = [
		{
			key: 'repo',
			ok: hasRepo,
			requiredInProd: true,
			label: 'Repository binding',
			detail: hasRepo ? `Detected ${repo}` : 'KEYSTATIC_GITHUB_REPO must be owner/repo.',
		},
		{
			key: 'secret',
			ok: hasSecret,
			requiredInProd: true,
			label: 'Keystatic secret',
			detail: hasSecret ? `KEYSTATIC_SECRET length is valid (>= ${MIN_KEYSTATIC_SECRET_LENGTH}).` : `KEYSTATIC_SECRET must be at least ${MIN_KEYSTATIC_SECRET_LENGTH} characters.`,
		},
		{
			key: 'client-id',
			ok: hasClientId,
			requiredInProd: true,
			label: 'GitHub OAuth client id',
			detail: hasClientId ? 'KEYSTATIC_GITHUB_CLIENT_ID is set.' : 'Missing KEYSTATIC_GITHUB_CLIENT_ID.',
		},
		{
			key: 'client-secret',
			ok: hasClientSecret,
			requiredInProd: true,
			label: 'GitHub OAuth client secret',
			detail: hasClientSecret ? 'KEYSTATIC_GITHUB_CLIENT_SECRET is set.' : 'Missing KEYSTATIC_GITHUB_CLIENT_SECRET.',
		},
		{
			key: 'database-url',
			ok: hasDatabaseUrl,
			requiredInProd: true,
			label: 'Database URL',
			detail: hasDatabaseUrl ? 'DATABASE_URL is set.' : 'Missing DATABASE_URL.',
		},
		{
			key: 'database-connectivity',
			ok: databaseReachable,
			requiredInProd: true,
			label: 'Database connectivity',
			detail: dbDetail,
		},
		{
			key: 'poll-table',
			ok: pollTableExists,
			requiredInProd: true,
			label: 'Poll schema readiness',
			detail: pollTableDetail,
		},
		{
			key: 'poll-write',
			ok: pollWriteHealthy,
			requiredInProd: true,
			label: 'Poll write health',
			detail: pollWriteDetail,
		},
		{
			key: 'callback',
			ok: true,
			requiredInProd: false,
			label: 'OAuth callback URL',
			detail: `Set this exact callback URL in GitHub OAuth app: ${callbackUrl}`,
		},
	];

	const isReady = !isProduction || checks.filter((item) => item.requiredInProd).every((item) => item.ok);

	return new Response(
		JSON.stringify({
			ok: true,
			isProduction,
			isReady,
			repo,
			callbackUrl,
			checks,
		}),
		{
			status: 200,
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'cache-control': 'no-store',
			},
		},
	);
};
