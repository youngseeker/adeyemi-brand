import { createHash } from 'node:crypto';
import { defineMiddleware } from 'astro:middleware';

const protectedPrefixes = ['/admin', '/api/admin', '/publish'];
const publicAdminRoutes = ['/admin/login', '/api/admin/auth', '/api/admin/logout'];

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');
const DEV_FALLBACK_ADMIN_PASSWORD = 'dev-admin-pass';

const withSecurityHeaders = (response: Response) => {
    const securedResponse = new Response(response.body, response);
    securedResponse.headers.set('x-content-type-options', 'nosniff');
    securedResponse.headers.set('x-frame-options', 'SAMEORIGIN');
    securedResponse.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
    securedResponse.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=()');
    if (!import.meta.env.DEV) {
        securedResponse.headers.set('strict-transport-security', 'max-age=31536000; includeSubDomains; preload');
    }
    return securedResponse;
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
        const loginPath = `/admin/login?next=${encodeURIComponent(pathname)}`;
        return withSecurityHeaders(Response.redirect(new URL(loginPath, context.url.origin), 302));
    }

    const response = await next();
    return withSecurityHeaders(response);
});