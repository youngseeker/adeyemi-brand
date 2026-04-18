import { sql } from 'drizzle-orm';
import { db } from '../db';

export type AppErrorEvent = {
	area: 'polls' | 'newsletter' | 'system';
	code: string;
	detail?: string;
	path?: string;
};

let tableReady = false;
let writeCounter = 0;

const MAX_DETAIL_LENGTH = 500;
const MAX_PATH_LENGTH = 255;
const RETENTION_DAYS = 30;
const RETENTION_CLEANUP_EVERY_WRITES = 50;

const sanitizeText = (value: string, maxLength: number) =>
	String(value || '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, maxLength);

const runRetentionCleanup = async () => {
	if (writeCounter % RETENTION_CLEANUP_EVERY_WRITES !== 0) return;

	try {
		await db.execute(sql`
			DELETE FROM app_error_events
			WHERE created_at < now() - (${RETENTION_DAYS} * interval '1 day')
		`);
	} catch {
		// Retention failures should not impact request handling.
	}
};

const ensureErrorTable = async () => {
	if (tableReady) return;

	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS app_error_events (
			id serial PRIMARY KEY,
			area varchar(40) NOT NULL,
			code varchar(120) NOT NULL,
			detail text,
			path varchar(255),
			created_at timestamp DEFAULT now()
		)
	`);

	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS app_error_events_created_at_idx
		ON app_error_events (created_at DESC)
	`);

	await db.execute(sql`
		CREATE INDEX IF NOT EXISTS app_error_events_area_idx
		ON app_error_events (area)
	`);

	tableReady = true;
};

export const logAppError = async (event: AppErrorEvent) => {
	try {
		await ensureErrorTable();
		writeCounter += 1;

		const safeCode = sanitizeText(event.code, 120) || 'unknown_error';
		const safeDetail = sanitizeText(event.detail || '', MAX_DETAIL_LENGTH);
		const safePath = sanitizeText(event.path || '', MAX_PATH_LENGTH);

		await db.execute(sql`
			INSERT INTO app_error_events (area, code, detail, path)
			VALUES (${event.area}, ${safeCode}, ${safeDetail}, ${safePath})
		`);

		await runRetentionCleanup();
	} catch {
		// Logging must never break user-facing flows.
	}
};

export const getErrorMetricsLast24h = async () => {
	try {
		await ensureErrorTable();

		const totalsRows = await db.execute(sql`
			SELECT
				count(*)::int as total_errors,
				count(*) FILTER (WHERE area = 'polls')::int as poll_errors,
				count(*) FILTER (WHERE area = 'newsletter')::int as newsletter_errors
			FROM app_error_events
			WHERE created_at >= now() - interval '24 hours'
		`);
		const totalsRow = Array.isArray(totalsRows) ? totalsRows[0] : totalsRows?.rows?.[0];

		const recentRows = await db.execute(sql`
			SELECT area, code, detail, path, created_at
			FROM app_error_events
			ORDER BY created_at DESC
			LIMIT 8
		`);

		return {
			totalErrors24h: Number((totalsRow as { total_errors?: unknown } | undefined)?.total_errors || 0),
			pollErrors24h: Number((totalsRow as { poll_errors?: unknown } | undefined)?.poll_errors || 0),
			newsletterErrors24h: Number((totalsRow as { newsletter_errors?: unknown } | undefined)?.newsletter_errors || 0),
			recentErrors: (Array.isArray(recentRows) ? recentRows : [])
				.map((row) => ({
					area: String((row as { area?: unknown }).area || ''),
					code: String((row as { code?: unknown }).code || ''),
					detail: String((row as { detail?: unknown }).detail || ''),
					path: String((row as { path?: unknown }).path || ''),
					createdAt: (row as { created_at?: unknown }).created_at
						? new Date(String((row as { created_at?: unknown }).created_at)).toISOString()
						: '',
				}))
				.filter((entry) => entry.area && entry.code),
		};
	} catch {
		return {
			totalErrors24h: 0,
			pollErrors24h: 0,
			newsletterErrors24h: 0,
			recentErrors: [],
		};
	}
};
