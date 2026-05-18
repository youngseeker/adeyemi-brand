export type FeedbackStatus = 'pending' | 'approved' | 'rejected';

export type FeedbackItem = {
	id: string;
	slug: string;
	title: string;
	name: string;
	rating: number;
	comment: string;
	status: FeedbackStatus;
	createdAt: string;
	ipHash?: string;
	parentId?: string;
	reactions?: Record<string, number>;
};

type RuntimeStore = {
	feedback: FeedbackItem[];
	newsletterSubscribers: Array<{ email: string; createdAt: string }>;
	pollVotes: Array<{ slug: string; pollKey: string; optionIndex: number; ipHash: string; createdAt: string }>;
	articleReactions: Array<{ slug: string; ipHash: string; createdAt: string }>;
	views: Record<string, number>;
};

const runtimeStoreKey = '__adeyemiBrandRuntimeStore';

const globalRuntime = globalThis as unknown as Record<string, RuntimeStore | undefined>;

if (!globalRuntime[runtimeStoreKey]) {
	globalRuntime[runtimeStoreKey] = {
		feedback: [],
		newsletterSubscribers: [],
		pollVotes: [],
		articleReactions: [],
		views: {},
	};
}

export const runtimeStore = globalRuntime[runtimeStoreKey] as RuntimeStore;
