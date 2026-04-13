import type { APIRoute } from 'astro';
import { sql } from 'drizzle-orm';
import { db } from '../../db';

const CONTACT_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL || 'danieladeniji001@gmail.com';
const ADMIN_KEY = import.meta.env.REVIEW_ADMIN_KEY || '';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const ensureNewsletterTable = async () => {
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS newsletter_subscribers (
			id serial PRIMARY KEY,
			email varchar(255) NOT NULL,
			created_at timestamp DEFAULT now()
		)
	`);
	await db.execute(sql`
		CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_unique
		ON newsletter_subscribers (email)
	`);
};

const newsletterSubscribers = sql.identifier('newsletter_subscribers');
const emailColumn = sql.identifier('email');
const createdAtColumn = sql.identifier('created_at');

const upsertSubscriber = async (email: string) => {
	await db.execute(sql`
		INSERT INTO ${newsletterSubscribers} (${emailColumn})
		VALUES (${email})
		ON CONFLICT (${emailColumn}) DO NOTHING
	`);
};

const getSubscriberCount = async (): Promise<number> => {
	const result = await db.execute(sql`SELECT count(*)::int AS total FROM ${newsletterSubscribers}`);
	const row = Array.isArray(result) ? result[0] : null;
	return Number((row as { total?: unknown } | null)?.total || 0);
};

const listSubscribers = async (): Promise<Array<{ email: string; createdAt: string }>> => {
	const rows = await db.execute(sql`SELECT ${emailColumn}, ${createdAtColumn} FROM ${newsletterSubscribers} ORDER BY created_at DESC`);
	if (!Array.isArray(rows)) return [];
	return rows
		.map((row) => {
			const email = String((row as { email?: unknown }).email || '').trim();
			const createdAtRaw = (row as { created_at?: unknown }).created_at;
			return {
				email,
				createdAt: createdAtRaw ? new Date(String(createdAtRaw)).toISOString() : '',
			};
		})
		.filter((row) => Boolean(row.email));
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const email = String(body.email || '').trim().toLowerCase();

		if (!email || !isValidEmail(email)) {
			return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
		}

		try {
			await ensureNewsletterTable();
			await upsertSubscriber(email);
		} catch {
			return new Response(
				JSON.stringify({ ok: false, error: 'Newsletter service is temporarily unavailable', contactEmail: CONTACT_EMAIL }),
				{ status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } },
			);
		}

		return new Response(JSON.stringify({ ok: true, message: 'Thanks for subscribing!', contactEmail: CONTACT_EMAIL }), {
			status: 201,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		});
	} catch {
		return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400 });
	}
};

export const GET: APIRoute = async ({ request }) => {
	let countValue = 0;
	let subscribers: Array<{ email: string; createdAt: string }> | undefined;
	let adminAccess = false;

	try {
		await ensureNewsletterTable();
		countValue = await getSubscriberCount();
		const requestAdminKey = request.headers.get('x-admin-key') || '';
		if (ADMIN_KEY && requestAdminKey && requestAdminKey === ADMIN_KEY) {
			adminAccess = true;
			subscribers = await listSubscribers();
		}
	} catch {
		countValue = 0;
	}

	return new Response(
		JSON.stringify({
			count: countValue,
			adminAccess,
			contactEmail: CONTACT_EMAIL,
			...(subscribers ? { subscribers } : {}),
		}),
		{
			status: 200,
			headers: { 'content-type': 'application/json; charset=utf-8' },
		},
	);
};
