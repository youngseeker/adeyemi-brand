type RichNode = {
	type?: unknown;
	level?: unknown;
	text?: unknown;
	children?: unknown;
	[key: string]: unknown;
};

export type ArticleHeading = {
	level: 2 | 3;
	text: string;
	slug: string;
};

const slugify = (value: string): string =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '');

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
	return text.trim();
};

const collectHeadings = (node: unknown, output: ArticleHeading[]) => {
	if (!node || typeof node !== 'object') return;
	const richNode = node as RichNode;
	const level = Number(richNode.level);
	if (richNode.type === 'heading' && (level === 2 || level === 3)) {
		const text = nodeToText(richNode).trim();
		if (text) {
			output.push({
				level: level as 2 | 3,
				text,
				slug: slugify(text),
			});
		}
	}
	if (Array.isArray(richNode.children)) {
		for (const child of richNode.children) {
			collectHeadings(child, output);
		}
	}
};

export const extractArticleHeadings = (document: unknown): ArticleHeading[] => {
	if (!Array.isArray(document)) return [];
	const headings: ArticleHeading[] = [];
	for (const node of document) {
		collectHeadings(node, headings);
	}
	const seen = new Map<string, number>();
	return headings.map((heading) => {
		const count = seen.get(heading.slug) || 0;
		seen.set(heading.slug, count + 1);
		if (count === 0) return heading;
		return { ...heading, slug: `${heading.slug}-${count + 1}` };
	});
};
