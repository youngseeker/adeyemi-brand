import type { APIRoute } from 'astro';
import { desc, eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { newsletterSubscribers } from '../../db/schema';

const CONTACT_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL || 'danieladeniji001@gmail.com';
const ADMIN_KEY = import.meta.env.REVIEW_ADMIN_KEY || '';
const RESEND_API_KEY = import.meta.env.RESEND_API_KEY || '';
const NEWSLETTER_FROM_EMAIL = import.meta.env.NEWSLETTER_FROM_EMAIL || '';

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

const getSubscriberCount = async (): Promise<number> => {
	const [row] = await db.select({ total: sql<number>`count(*)::int` }).from(newsletterSubscribers);
	return Number(row?.total || 0);
};

const listSubscribers = async (): Promise<Array<{ email: string; createdAt: string }>> => {
	const rows = await db
		.select({ email: newsletterSubscribers.email, createdAt: newsletterSubscribers.createdAt })
		.from(newsletterSubscribers)
		.orderBy(desc(newsletterSubscribers.createdAt));
	return rows
		.map((row) => {
			const email = String(row.email || '').trim();
			return {
				email,
				createdAt: row.createdAt ? new Date(String(row.createdAt)).toISOString() : '',
			};
		})
		.filter((row) => Boolean(row.email));
};

const createSubscriber = async (email: string): Promise<boolean> => {
	const [existing] = await db
		.select({ id: newsletterSubscribers.id })
		.from(newsletterSubscribers)
		.where(eq(newsletterSubscribers.email, email))
		.limit(1);

	if (existing?.id) return false;

	await db.insert(newsletterSubscribers).values({ email });
	return true;
};

const sendResendEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> => {
	if (!RESEND_API_KEY || !NEWSLETTER_FROM_EMAIL) return false;

	try {
		const response = await fetch('https://api.resend.com/emails', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${RESEND_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				from: NEWSLETTER_FROM_EMAIL,
				to: [to],
				subject,
				html,
			}),
		});

		return response.ok;
	} catch {
		return false;
	}
};

const sendNewsletterSignupEmails = async (subscriberEmail: string) => {
	await Promise.allSettled([
		sendResendEmail({
			to: subscriberEmail,
			subject: 'You are subscribed to Adeyemi\'s newsletter',
			html: `<p>Hi there,</p><p>Thanks for subscribing. You will receive new essays and publishing updates here.</p><p>- Adeyemi</p>`,
		}),
		sendResendEmail({
			to: CONTACT_EMAIL,
			subject: 'New newsletter subscriber',
			html: `<p>New subscriber: <strong>${subscriberEmail}</strong></p>`,
		}),
	]);
};

export const POST: APIRoute = async ({ request }) => {
	try {
		const body = await request.json();
		const email = String(body.email || '').trim().toLowerCase();

		if (!email || !isValidEmail(email)) {
			return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
		}

		let isNewSubscriber = false;

		try {
			await ensureNewsletterTable();
			isNewSubscriber = await createSubscriber(email);
		} catch {
			return new Response(
				JSON.stringify({ ok: false, error: 'Newsletter service is temporarily unavailable', contactEmail: CONTACT_EMAIL }),
				{ status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } },
			);
		}

		if (isNewSubscriber) {
			await sendNewsletterSignupEmails(email);
		}

		return new Response(JSON.stringify({
			ok: true,
			message: isNewSubscriber ? 'Thanks for subscribing!' : 'You are already subscribed.',
			contactEmail: CONTACT_EMAIL,
		}), {
			status: isNewSubscriber ? 201 : 200,
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
