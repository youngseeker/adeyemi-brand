import type { APIRoute } from 'astro';
import { eq, sql } from 'drizzle-orm';
import { db } from '../../db';
import { appMeta } from '../../db/schema';

const ensureAppMetaTable = async () => {
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS app_meta (
			key varchar(120) PRIMARY KEY NOT NULL,
			value text NOT NULL
		)
	`);
};

const getStoredBootTimestamp = async () => {
	try {
		const [existing] = await db.select().from(appMeta).where(eq(appMeta.key, 'boot_timestamp'));
		const parsed = Number(existing?.value || 0);
		if (!parsed || Number.isNaN(parsed)) return null;
		return parsed;
	} catch {
		return null;
	}
};

const persistBootTimestamp = async (value: number) => {
	try {
		await db
			.insert(appMeta)
			.values({ key: 'boot_timestamp', value: String(value) })
			.onConflictDoUpdate({ target: appMeta.key, set: { value: String(value) } });
		return true;
	} catch {
		return false;
	}
};

export const GET: APIRoute = async () => {
	const now = Date.now();
	let bootTimestampMs = await getStoredBootTimestamp();

	if (!bootTimestampMs) {
		try {
			await ensureAppMetaTable();
		} catch {
			// If table creation fails, keep endpoint healthy with an in-memory fallback.
		}
		bootTimestampMs = await getStoredBootTimestamp();
	}

	if (!bootTimestampMs) {
		bootTimestampMs = now;
		await persistBootTimestamp(bootTimestampMs);
	}

	const uptimeSeconds = Math.floor((now - bootTimestampMs) / 1000);

	return new Response(
		JSON.stringify({
			status: 'ok',
			uptimeSeconds,
			timestamp: new Date().toISOString(),
		}),
		{
			status: 200,
			headers: {
				'content-type': 'application/json; charset=utf-8',
				'cache-control': 'no-store',
			},
		},
	);
};
