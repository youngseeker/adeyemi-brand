import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ cookies }) => {
	cookies.delete('admin_session', { path: '/' });
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
};
