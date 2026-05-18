type RichNode = {
	text?: unknown;
	children?: unknown;
	[key: string]: unknown;
};

const WORDS_PER_MINUTE = 220;

const nodeToText = (node: unknown): string => {
	if (!node || typeof node !== 'object') return '';
	const richNode = node as RichNode;
	let text = '';
	if (typeof richNode.text === 'string') text += ` ${richNode.text}`;
	if (Array.isArray(richNode.children)) {
		for (const child of richNode.children) {
			text += ` ${nodeToText(child)}`;
		}
	}
	return text;
};

export const readingMinutesFromDocument = (document: unknown): number => {
	if (typeof document === 'string') {
		const words = document.split(/\s+/).filter(Boolean).length;
		return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
	}

	if (!Array.isArray(document)) return 1;
	const text = document.map((node) => nodeToText(node)).join(' ').trim();
	if (!text) return 1;
	const words = text.split(/\s+/).filter(Boolean).length;
	return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
};

export const formatReadingMinutes = (minutes: number): string => `${Math.max(1, minutes)} min read`;
