import type { APIRoute } from 'astro';

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
	const callbackUrl = `${url.origin}/api/keystatic/github/oauth/callback`;

	const checks = [
		{
			key: 'repo',
			ok: hasRepo,
			label: 'Repository binding',
			detail: hasRepo ? `Detected ${repo}` : 'KEYSTATIC_GITHUB_REPO must be owner/repo.',
		},
		{
			key: 'secret',
			ok: hasSecret,
			label: 'Keystatic secret',
			detail: hasSecret ? `KEYSTATIC_SECRET length is valid (>= ${MIN_KEYSTATIC_SECRET_LENGTH}).` : `KEYSTATIC_SECRET must be at least ${MIN_KEYSTATIC_SECRET_LENGTH} characters.`,
		},
		{
			key: 'client-id',
			ok: hasClientId,
			label: 'GitHub OAuth client id',
			detail: hasClientId ? 'KEYSTATIC_GITHUB_CLIENT_ID is set.' : 'Missing KEYSTATIC_GITHUB_CLIENT_ID.',
		},
		{
			key: 'client-secret',
			ok: hasClientSecret,
			label: 'GitHub OAuth client secret',
			detail: hasClientSecret ? 'KEYSTATIC_GITHUB_CLIENT_SECRET is set.' : 'Missing KEYSTATIC_GITHUB_CLIENT_SECRET.',
		},
		{
			key: 'callback',
			ok: true,
			label: 'OAuth callback URL',
			detail: `Set this exact callback URL in GitHub OAuth app: ${callbackUrl}`,
		},
	];

	const isReady = !isProduction || checks.slice(0, 4).every((item) => item.ok);

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
