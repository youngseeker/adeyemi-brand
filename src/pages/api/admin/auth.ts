import type { APIRoute } from 'astro';
import { createHash } from 'node:crypto';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 6;
const attemptsByIp = new Map<string, { count: number; resetAt: number }>();
const DEV_FALLBACK_ADMIN_PASSWORD = 'dev-admin-pass';

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

const getIp = (request: Request) => {
	const forwarded = request.headers.get('x-forwarded-for') || '';
	const realIp = request.headers.get('x-real-ip') || '';
	return (forwarded.split(',')[0] || realIp || 'unknown').trim();
};

export const POST: APIRoute = async ({ request, cookies }) => {
	const configuredAdminPassword = import.meta.env.ADMIN_PAGE_PASSWORD || '';
	const adminPassword = configuredAdminPassword || (import.meta.env.DEV ? DEV_FALLBACK_ADMIN_PASSWORD : '');
	if (!adminPassword) {
		return new Response(JSON.stringify({ error: 'ADMIN_PAGE_PASSWORD is not configured.' }), { status: 503 });
	}

	const ip = getIp(request);
	const now = Date.now();
	const existing = attemptsByIp.get(ip);
	if (existing && existing.resetAt > now && existing.count >= MAX_ATTEMPTS) {
		return new Response(JSON.stringify({ error: 'Too many attempts. Try again later.' }), { status: 429 });
	}

	let body: { password?: string; next?: string } = {};
	try {
		body = await request.json();
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400 });
	}

	const password = String(body.password || '');
	const nextPath = String(body.next || '/admin');
	if (password !== adminPassword) {
		if (!existing || existing.resetAt <= now) {
			attemptsByIp.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
		} else {
			attemptsByIp.set(ip, { count: existing.count + 1, resetAt: existing.resetAt });
		}
		return new Response(JSON.stringify({ error: 'Invalid password' }), { status: 401 });
	}

	attemptsByIp.delete(ip);
	cookies.set('admin_session', hashSecret(adminPassword), {
		httpOnly: true,
		path: '/',
		secure: !import.meta.env.DEV,
		sameSite: 'lax',
		maxAge: 60 * 60 * 8,
	});

	const safeNext = nextPath.startsWith('/admin') || nextPath.startsWith('/keystatic') || nextPath.startsWith('/publish')
		? nextPath
		: '/admin';

	return new Response(JSON.stringify({ ok: true, redirectTo: safeNext }), {
		status: 200,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
};
