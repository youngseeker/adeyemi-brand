import { and, eq, sql } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db } from '../db';
import { pollVotes } from '../db/schema';

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
			return { enabled: false as const, results: [] as PollResult[] };
		}
	}

	if (!rows) {
		return { enabled: false as const, results: [] as PollResult[] };
	}

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
			counts: result.counts,
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
		return null;
	}
};
