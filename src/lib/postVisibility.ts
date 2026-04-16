export type PublishingStatus = 'draft' | 'published' | 'scheduled';

type VisibilityInput = {
	status?: unknown;
	scheduledFor?: unknown;
	publishedAt?: unknown;
};

const parseMs = (value: unknown): number | null => {
	if (value instanceof Date) {
		const parsed = value.getTime();
		return Number.isNaN(parsed) ? null : parsed;
	}

	if (typeof value !== 'string' || !value.trim()) return null;
	const parsed = Date.parse(value);
	return Number.isNaN(parsed) ? null : parsed;
};

export const normalizePublishingStatus = (value: unknown): PublishingStatus => {
	if (value === 'draft' || value === 'scheduled' || value === 'published') return value;
	return 'published';
};

export const isPubliclyVisiblePost = (input: VisibilityInput, nowMs = Date.now()): boolean => {
	const status = normalizePublishingStatus(input.status);
	if (status === 'draft') return false;

	if (status === 'scheduled') {
		const scheduledMs = parseMs(input.scheduledFor) ?? parseMs(input.publishedAt);
		if (!scheduledMs) return false;
		return scheduledMs <= nowMs;
	}

	const publishMs = parseMs(input.publishedAt);
	if (publishMs && publishMs > nowMs) return false;
	return true;
};
