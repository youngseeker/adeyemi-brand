import { createHash } from 'node:crypto';
import { defineMiddleware } from 'astro:middleware';

const protectedPrefixes = ['/admin', '/keystatic', '/publish'];
const publicAdminRoutes = ['/admin/login', '/api/admin/auth', '/api/admin/logout', '/keystatic/entry-creation', '/keystatic/live-client'];

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');
const DEV_FALLBACK_ADMIN_PASSWORD = 'dev-admin-pass';

const withSecurityHeaders = (response: Response) => {
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('x-frame-options', 'SAMEORIGIN');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
	if (!import.meta.env.DEV) {
		response.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
	}
	return response;
};

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = context.url;
	const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
	const isPublicAdminRoute = publicAdminRoutes.some((route) => pathname.startsWith(route));

	if (!isProtected || isPublicAdminRoute) {
		const response = await next();
		return withSecurityHeaders(response);
	}

	const configuredAdminPassword = import.meta.env.ADMIN_PAGE_PASSWORD || '';
	const adminPassword = configuredAdminPassword || (import.meta.env.DEV ? DEV_FALLBACK_ADMIN_PASSWORD : '');
	if (!adminPassword) {
		return withSecurityHeaders(new Response('Admin password is not configured. Set ADMIN_PAGE_PASSWORD in environment.', {
			status: 503,
			headers: { 'content-type': 'text/plain; charset=utf-8' },
		}));
	}

	const expectedSession = hashSecret(adminPassword);
	const sessionCookie = context.cookies.get('admin_session')?.value || '';

	if (sessionCookie !== expectedSession) {
		const loginUrl = new URL('/admin/login', context.url);
		loginUrl.searchParams.set('next', pathname);
		return withSecurityHeaders(Response.redirect(loginUrl, 302));
	}

	const response = await next();
	return withSecurityHeaders(response);
});
