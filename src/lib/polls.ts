import { and, eq, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '../db';
import { pollVotes } from '../db/schema';
import { logAppError } from './errorTelemetry';
import { runtimeStore } from './runtimeStore';

export type PollResult = {
	pollKey: string;
	counts: number[];
	total: number;
	myVoteIndex: number | null;
};

const ensurePollVotesTable = async () => {
	await db.execute(sql`
		CREATE TABLE IF NOT EXISTS poll_votes (
			id serial PRIMARY KEY,
			slug varchar(255) NOT NULL,
			poll_key varchar(255) NOT NULL,
			option_index integer NOT NULL,
			ip_hash varchar(128) NOT NULL,
			created_at timestamp DEFAULT now()
		)
	`);
	await db.execute(sql`
		CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_slug_poll_ip_unique
		ON poll_votes (slug, poll_key, ip_hash)
	`);
};

const getRuntimePollRows = (slug: string) => runtimeStore.pollVotes.filter((row) => row.slug === slug);

const getRuntimePollResults = (slug: string, ipHash?: string) => {
	const rows = getRuntimePollRows(slug);
	const grouped = new Map<string, { counts: number[]; total: number; myVoteIndex: number | null }>();

	for (const row of rows) {
		if (!grouped.has(row.pollKey)) {
			grouped.set(row.pollKey, { counts: [], total: 0, myVoteIndex: null });
		}
		const current = grouped.get(row.pollKey)!;
		current.counts[row.optionIndex] = (current.counts[row.optionIndex] || 0) + 1;
		current.total += 1;
		if (ipHash && row.ipHash === ipHash) {
			current.myVoteIndex = row.optionIndex;
		}
	}

	return {
		enabled: true as const,
		results: Array.from(grouped.entries()).map(([pollKey, result]) => ({
			pollKey,
			counts: Array.from({ length: result.counts.length }, (_, index) => result.counts[index] || 0),
			total: result.total,
			myVoteIndex: result.myVoteIndex,
		})),
	};
};

export const getIpHash = (input: Request | Headers): string => {
	const headers = input instanceof Request ? input.headers : input;
	const forwarded = headers.get('x-forwarded-for') || '';
	const realIp = headers.get('x-real-ip') || '';
	const cfIp = headers.get('cf-connecting-ip') || '';
	const vercelForwarded = headers.get('x-vercel-forwarded-for') || '';
	const ip = (forwarded.split(',')[0] || vercelForwarded.split(',')[0] || realIp || cfIp || 'unknown').trim();
	const visitorId = (headers.get('x-poll-visitor-id') || '').trim();
	const userAgent = (headers.get('user-agent') || '').trim();
	const identity = [ip || 'unknown-ip', visitorId || 'unknown-visitor', userAgent || 'unknown-agent'].join('|');
	return createHash('sha256').update(identity).digest('hex');
};

const getPollRows = async (slug: string) => {
	try {
		return await db
			.select({
				pollKey: pollVotes.pollKey,
				optionIndex: pollVotes.optionIndex,
				ipHash: pollVotes.ipHash,
			})
			.from(pollVotes)
			.where(eq(pollVotes.slug, slug));
	} catch {
		void logAppError({
			area: 'polls',
			code: 'poll_query_failed',
			detail: 'Unable to fetch poll rows from storage.',
			path: '/lib/polls#getPollRows',
		});
		return null;
	}
};

export const getPollResults = async (slug: string, ipHash?: string) => {
	let rows = await getPollRows(slug);
	if (!rows) {
		try {
			await ensurePollVotesTable();
			rows = await getPollRows(slug);
		} catch {
			void logAppError({
				area: 'polls',
				code: 'poll_bootstrap_failed',
				detail: 'Unable to create or initialize poll_votes table.',
				path: '/lib/polls#getPollResults',
			});
			return getRuntimePollResults(slug, ipHash);
		}
	}

	if (!rows) {
		return getRuntimePollResults(slug, ipHash);
	}

	const runtimeRows = getRuntimePollRows(slug);
	const combinedRows = runtimeRows.length > 0 ? [...rows, ...runtimeRows] : rows;
	const grouped = new Map<string, { counts: number[]; total: number; myVoteIndex: number | null }>();

	for (const row of combinedRows) {
		if (!grouped.has(row.pollKey)) {
			grouped.set(row.pollKey, { counts: [], total: 0, myVoteIndex: null });
		}
		const current = grouped.get(row.pollKey)!;
		current.counts[row.optionIndex] = (current.counts[row.optionIndex] || 0) + 1;
		current.total += 1;
		if (ipHash && row.ipHash === ipHash) {
			current.myVoteIndex = row.optionIndex;
		}
	}

	return {
		enabled: true as const,
		results: Array.from(grouped.entries()).map(([pollKey, result]) => ({
			pollKey,
			counts: Array.from({ length: result.counts.length }, (_, index) => result.counts[index] || 0),
			total: result.total,
			myVoteIndex: result.myVoteIndex,
		})),
	};
};

export const savePollVote = async ({
	slug,
	pollKey,
	optionIndex,
	ipHash,
}: {
	slug: string;
	pollKey: string;
	optionIndex: number;
	ipHash: string;
}) => {
	try {
		const [existing] = await db
			.select({ id: pollVotes.id })
			.from(pollVotes)
			.where(and(eq(pollVotes.slug, slug), eq(pollVotes.pollKey, pollKey), eq(pollVotes.ipHash, ipHash)))
			.limit(1);

		if (existing) {
			await db.update(pollVotes).set({ optionIndex }).where(eq(pollVotes.id, existing.id));
		} else {
			await db.insert(pollVotes).values({ slug, pollKey, optionIndex, ipHash });
		}

		return await getPollResults(slug, ipHash);
	} catch {
		const existingIndex = runtimeStore.pollVotes.findIndex(
			(row) => row.slug === slug && row.pollKey === pollKey && row.ipHash === ipHash,
		);
		if (existingIndex >= 0) {
			runtimeStore.pollVotes[existingIndex] = {
				...runtimeStore.pollVotes[existingIndex],
				optionIndex,
				createdAt: new Date().toISOString(),
			};
		} else {
			runtimeStore.pollVotes.push({
				slug,
				pollKey,
				optionIndex,
				ipHash,
				createdAt: new Date().toISOString(),
			});
		}

		void logAppError({
			area: 'polls',
			code: 'poll_vote_save_failed',
			detail: `Failed to save vote for ${slug}/${pollKey}.`,
			path: '/lib/polls#savePollVote',
		});
		return getRuntimePollResults(slug, ipHash);
	}
};
