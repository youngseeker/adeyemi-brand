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
};

type RuntimeStore = {
	feedback: FeedbackItem[];
	views: Record<string, number>;
};

const runtimeStoreKey = '__adeyemiBrandRuntimeStore';

const globalRuntime = globalThis as unknown as Record<string, RuntimeStore | undefined>;

if (!globalRuntime[runtimeStoreKey]) {
	globalRuntime[runtimeStoreKey] = {
		feedback: [],
		views: {},
	};
}

export const runtimeStore = globalRuntime[runtimeStoreKey] as RuntimeStore;
