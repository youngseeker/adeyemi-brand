import type { APIRoute } from 'astro';
import { desc, sql } from 'drizzle-orm';
import nodemailer from 'nodemailer';
import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../../../keystatic.config';
import { db } from '../../../db';
import { newsletterSubscribers } from '../../../db/schema';
import { isPubliclyVisiblePost } from '../../../lib/postVisibility';

type DispatchRecord = {
	slug: string;
	title: string;
	sentAt: string;
	recipients: number;
};

const CONTACT_EMAIL = import.meta.env.PUBLIC_CONTACT_EMAIL || 'danieladeniji001@gmail.com';
const ADMIN_KEY = import.meta.env.REVIEW_ADMIN_KEY || '';
const CRON_SECRET = import.meta.env.CRON_SECRET || '';

const SMTP_HOST = import.meta.env.SMTP_HOST || '';
const SMTP_PORT = Number(import.meta.env.SMTP_PORT || 587);
const SMTP_USER = import.meta.env.SMTP_USER || '';
const SMTP_PASSWORD = import.meta.env.SMTP_PASSWORD || '';
const SMTP_FROM_EMAIL = import.meta.env.SMTP_FROM_EMAIL || '';
const SMTP_FROM_NAME = import.meta.env.SMTP_FROM_NAME || 'A.ADENIJI';
const SMTP_SECURE = String(import.meta.env.SMTP_SECURE || '').toLowerCase() === 'true';

const reader = createReader(process.cwd(), keystaticConfig);

const newsletterDispatches = {
	table: sql.identifier('newsletter_article_dispatches'),
	slug: sql.identifier('slug'),
	title: sql.identifier('title'),
	sentAt: sql.identifier('sent_at'),
	recipients: sql.identifier('recipients'),
};

const isValidAdminRequest = (request: Request) => {
	const adminKey = request.headers.get('x-admin-key') || '';
	if (ADMIN_KEY && adminKey === ADMIN_KEY) return true;

	const authHeader = request.headers.get('authorization') || '';
	if (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) return true;

	return false;
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

const ensureDispatchTable = async () => {
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS newsletter_article_dispatches (
			id serial PRIMARY KEY,
			slug varchar(255) NOT NULL,
			title varchar(255) NOT NULL,
			recipients int NOT NULL DEFAULT 0,
			sent_at timestamp DEFAULT now()
		)
	`);

	await db.execute(sql`
		CREATE UNIQUE INDEX IF NOT EXISTS newsletter_article_dispatches_slug_unique
		ON newsletter_article_dispatches (slug)
	`);
};

const listSubscriberEmails = async (): Promise<string[]> => {
	const rows = await db
		.select({ email: newsletterSubscribers.email })
		.from(newsletterSubscribers)
		.orderBy(desc(newsletterSubscribers.createdAt));

	return rows
		.map((row) => String(row.email || '').trim().toLowerCase())
		.filter(Boolean);
};

const listDispatchedSlugs = async (): Promise<string[]> => {
	const rows = await db.execute(sql`SELECT ${newsletterDispatches.slug} FROM ${newsletterDispatches.table}`);
	if (!Array.isArray(rows)) return [];
	return rows.map((row) => String((row as { slug?: unknown }).slug || '').trim()).filter(Boolean);
};

const getLatestDispatch = async (): Promise<DispatchRecord | null> => {
	const rows = await db.execute(sql`
		SELECT ${newsletterDispatches.slug}, ${newsletterDispatches.title}, ${newsletterDispatches.sentAt}, ${newsletterDispatches.recipients}
		FROM ${newsletterDispatches.table}
		ORDER BY ${newsletterDispatches.sentAt} DESC
		LIMIT 1
	`);

	if (!Array.isArray(rows) || !rows.length) return null;
	const row = rows[0] as { slug?: unknown; title?: unknown; sent_at?: unknown; recipients?: unknown };

	return {
		slug: String(row.slug || ''),
		title: String(row.title || ''),
		sentAt: row.sent_at ? new Date(String(row.sent_at)).toISOString() : '',
		recipients: Number(row.recipients || 0),
	};
};

const recordDispatch = async (slug: string, title: string, recipients: number) => {
	await db.execute(sql`
		INSERT INTO ${newsletterDispatches.table} (${newsletterDispatches.slug}, ${newsletterDispatches.title}, ${newsletterDispatches.recipients})
		VALUES (${slug}, ${title}, ${recipients})
		ON CONFLICT (${newsletterDispatches.slug}) DO NOTHING
	`);
};

const chunk = <T>(items: T[], size: number) => {
	const batches: T[][] = [];
	for (let i = 0; i < items.length; i += size) {
		batches.push(items.slice(i, i + size));
	}
	return batches;
};

const buildArticleEmailHtml = ({
	title,
	excerpt,
	articleUrl,
	publishedAt,
}: {
	title: string;
	excerpt: string;
	articleUrl: string;
	publishedAt: string;
}) => {
	const safeExcerpt = excerpt || 'A new digital garden article is available now.';
	const safePublishedAt = publishedAt || 'Just published';

	return `
		<div style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;color:#111827;">
			<div style="max-width:680px;margin:0 auto;padding:30px 16px;">
				<div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;overflow:hidden;">
					<div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 100%);color:white;">
						<p style="margin:0;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.9;">A.ADENIJI Newsletter</p>
						<h1 style="margin:10px 0 0;font-size:28px;line-height:1.2;">New Article Published</h1>
					</div>
					<div style="padding:28px;">
						<p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;">${safePublishedAt}</p>
						<h2 style="margin:0 0 14px;font-size:30px;line-height:1.15;color:#111827;">${title}</h2>
						<p style="margin:0 0 22px;font-size:16px;line-height:1.6;color:#374151;">${safeExcerpt}</p>
						<a href="${articleUrl}" style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;font-size:13px;letter-spacing:0.08em;text-transform:uppercase;">Read Article</a>
						<p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#6b7280;">If this was forwarded to you, you can subscribe from the homepage newsletter section.</p>
					</div>
				</div>
				<p style="margin:16px 4px 0;font-size:12px;color:#6b7280;line-height:1.5;">Questions? Reach out via ${CONTACT_EMAIL}.</p>
			</div>
		</div>
	`;
};

const sendBroadcastForPost = async ({
	title,
	excerpt,
	slug,
	publishedAt,
	subscriberEmails,
	siteOrigin,
}: {
	title: string;
	excerpt: string;
	slug: string;
	publishedAt: string;
	subscriberEmails: string[];
	siteOrigin: string;
}) => {
	const transporter = getTransporter();
	if (!transporter) {
		return { ok: false, sent: 0, error: 'SMTP is not configured' };
	}

	const articleUrl = `${siteOrigin}/garden/${slug}`;
	const html = buildArticleEmailHtml({ title, excerpt, articleUrl, publishedAt });
	const text = `${title}\n\n${excerpt}\n\nRead: ${articleUrl}`;
	const batches = chunk(subscriberEmails, 40);
	let sent = 0;

	for (const recipients of batches) {
		try {
			await transporter.sendMail({
				from: `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL}>`,
				to: SMTP_FROM_EMAIL,
				bcc: recipients,
				subject: `New Article: ${title}`,
				html,
				text,
			});
			sent += recipients.length;
		} catch {
			// Continue sending next batch to maximize partial delivery.
		}
	}

	return { ok: sent > 0, sent, error: sent > 0 ? undefined : 'No emails were sent' };
};

const getVisiblePosts = async () => {
	const rawPosts = await reader.collections.posts.all();
	const visible = rawPosts
		.map(({ slug, entry }) => ({
			slug,
			title: String((entry as { title?: unknown }).title || slug),
			excerpt: String((entry as { excerpt?: unknown }).excerpt || ''),
			publishedAt: String((entry as { publishedAt?: unknown }).publishedAt || ''),
			status: (entry as { status?: unknown }).status,
			scheduledFor: (entry as { scheduledFor?: unknown }).scheduledFor,
		}))
		.filter((post) =>
			isPubliclyVisiblePost({
				status: post.status,
				scheduledFor: post.scheduledFor,
				publishedAt: post.publishedAt,
			}),
		)
		.sort((a, b) => {
			if (!a.publishedAt) return 1;
			if (!b.publishedAt) return -1;
			return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
		});

	return visible;
};

const runDispatch = async (siteOrigin: string) => {
	await ensureDispatchTable();

	const [subscriberEmails, dispatchedSlugs, visiblePosts] = await Promise.all([
		listSubscriberEmails(),
		listDispatchedSlugs(),
		getVisiblePosts(),
	]);

	if (!subscriberEmails.length) {
		return {
			ok: true,
			message: 'No subscribers yet. Dispatch skipped.',
			dispatched: [],
		};
	}

	const dispatchedSet = new Set(dispatchedSlugs);
	const unsentPosts = visiblePosts.filter((post) => !dispatchedSet.has(post.slug));

	if (!unsentPosts.length) {
		return {
			ok: true,
			message: 'No new published article to dispatch.',
			dispatched: [],
			lastDispatch: await getLatestDispatch(),
		};
	}

	const results: Array<{ slug: string; title: string; recipients: number; ok: boolean; error?: string }> = [];
	for (const post of unsentPosts) {
		const sentResult = await sendBroadcastForPost({
			title: post.title,
			excerpt: post.excerpt,
			slug: post.slug,
			publishedAt: post.publishedAt,
			subscriberEmails,
			siteOrigin,
		});

		if (sentResult.ok) {
			await recordDispatch(post.slug, post.title, sentResult.sent);
		}

		results.push({
			slug: post.slug,
			title: post.title,
			recipients: sentResult.sent,
			ok: sentResult.ok,
			error: sentResult.error,
		});
	}

	return {
		ok: true,
		message: `Processed ${results.length} article dispatch(es).`,
		dispatched: results,
		lastDispatch: await getLatestDispatch(),
	};
};

export const GET: APIRoute = async ({ request, url }) => {
	if (!isValidAdminRequest(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const siteOrigin = import.meta.env.PUBLIC_SITE_URL || url.origin;
	const result = await runDispatch(siteOrigin);

	return new Response(JSON.stringify(result), {
		status: 200,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
};

export const POST: APIRoute = async ({ request, url }) => {
	if (!isValidAdminRequest(request)) {
		return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
	}

	const siteOrigin = import.meta.env.PUBLIC_SITE_URL || url.origin;
	const result = await runDispatch(siteOrigin);

	return new Response(JSON.stringify(result), {
		status: 200,
		headers: { 'content-type': 'application/json; charset=utf-8' },
	});
};
