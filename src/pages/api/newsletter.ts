import type { APIRoute } from 'astro';
import { desc, eq, sql } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { db } from '../../db';
import { newsletterSubscribers } from '../../db/schema';

const CONTACT_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL || 'danieladeniji001@gmail.com';
const ADMIN_KEY = import.meta.env.REVIEW_ADMIN_KEY || '';
const SMTP_HOST = import.meta.env.SMTP_HOST || '';
const SMTP_PORT = Number(import.meta.env.SMTP_PORT || 587);
const SMTP_USER = import.meta.env.SMTP_USER || '';
const SMTP_PASSWORD = import.meta.env.SMTP_PASSWORD || '';
const SMTP_FROM_EMAIL = import.meta.env.SMTP_FROM_EMAIL || '';
const SMTP_FROM_NAME = import.meta.env.SMTP_FROM_NAME || 'A.ADENIJI';
const SMTP_SECURE = String(import.meta.env.SMTP_SECURE || '').toLowerCase() === 'true';

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

const getTransporter = () => {
	if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !SMTP_FROM_EMAIL) return null;

	return nodemailer.createTransport({
		host: SMTP_HOST,
		port: SMTP_PORT,
		secure: SMTP_SECURE,
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASSWORD,
		},
	});
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

const sendSmtpEmail = async ({ to, subject, html }: { to: string; subject: string; html: string }): Promise<boolean> => {
	const transporter = getTransporter();
	if (!transporter) return false;

	try {
		await transporter.sendMail({
			from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
			to,
			subject,
			html,
		});
		return true;
	} catch {
		return false;
	}
};

const sendNewsletterSignupEmails = async (subscriberEmail: string) => {
	await Promise.allSettled([
		sendSmtpEmail({
			to: subscriberEmail,
			subject: 'You are subscribed to Adeyemi\'s newsletter',
			html: `<p>Hi there,</p><p>Thanks for subscribing. You will receive new essays and publishing updates here.</p><p>- Adeyemi</p>`,
		}),
		sendSmtpEmail({
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
			mailConfigured: Boolean(getTransporter()),
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
