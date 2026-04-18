import { createHash } from 'node:crypto';

const DEV_FALLBACK_ADMIN_PASSWORD = 'dev-admin-pass';

const hashSecret = (secret: string) => createHash('sha256').update(secret).digest('hex');

const parseCookie = (cookieHeader: string, name: string) => {
	const segments = cookieHeader.split(';');
	for (const segment of segments) {
		const [rawKey, ...rest] = segment.trim().split('=');
		if (rawKey === name) {
			return decodeURIComponent(rest.join('='));
		}
	}
	return '';
};

const getAdminPassword = () => {
	const configured = import.meta.env.ADMIN_PAGE_PASSWORD || '';
	if (configured) return configured;
	if (import.meta.env.DEV) return DEV_FALLBACK_ADMIN_PASSWORD;
	return '';
};

export const hasValidAdminSession = (request: Request) => {
	const password = getAdminPassword();
	if (!password) return false;
	const cookieHeader = request.headers.get('cookie') || '';
	const sessionCookie = parseCookie(cookieHeader, 'admin_session');
	if (!sessionCookie) return false;
	return sessionCookie === hashSecret(password);
};

export const isAdminAuthorized = (request: Request) => {
	const reviewKey = import.meta.env.REVIEW_ADMIN_KEY || '';
	const headerKey = request.headers.get('x-admin-key') || '';
	if (reviewKey && headerKey && headerKey === reviewKey) return true;
	return hasValidAdminSession(request);
};
