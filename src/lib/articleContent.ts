import Markdoc from '@markdoc/markdoc';
import katex from 'katex';

type ArticleHeading = {
	text: string;
	slug: string;
	level: number;
};

type PollDefinition = {
	key: string;
	index: number;
	question: string;
	options: string[];
	note: string;
};

type FootnoteDefinition = {
	key: string;
	index: number;
	marker: string;
	note: string;
};

type RenderedArticleContent = {
	html: string;
	headings: ArticleHeading[];
	polls: PollDefinition[];
	footnotes: FootnoteDefinition[];
};

type RenderableNode = string | number | null | undefined | RenderableNode[] | { name?: string; attributes?: Record<string, unknown>; children?: RenderableNode[]; __html?: string };

const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');

const slugify = (value: string) =>
	value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '') || 'section';

const getNodeText = (value: RenderableNode): string => {
	if (typeof value === 'string' || typeof value === 'number') return String(value);
	if (Array.isArray(value)) return value.map(getNodeText).join('');
	if (!value || typeof value !== 'object') return '';
	if ('__html' in value && typeof value.__html === 'string') return '';
	const children = 'children' in value && Array.isArray(value.children) ? value.children : [];
	return children.map(getNodeText).join('');
};

const renderAttributes = (attributes: Record<string, unknown> = {}) => {
	const output: string[] = [];
	for (const [key, value] of Object.entries(attributes)) {
		if (value === undefined || value === null || value === false) continue;
		if (typeof value === 'boolean') {
			output.push(` ${key}`);
			continue;
		}
		output.push(` ${key}="${escapeHtml(String(value))}"`);
	}
	return output.join('');
};

const renderNode = (node: RenderableNode): string => {
	if (node === null || node === undefined) return '';
	if (typeof node === 'string' || typeof node === 'number') return escapeHtml(String(node));
	if (Array.isArray(node)) return node.map(renderNode).join('');
	if (typeof node === 'object' && '__html' in node && typeof node.__html === 'string') return node.__html;
	if (typeof node !== 'object' || !node.name) return '';

	const tagName = String(node.name);
	const attributes = node.attributes || {};
	const children = node.children || [];
	const openingTag = `<${tagName}${renderAttributes(attributes)}>`;
	if (voidTags.has(tagName)) return openingTag;
	return `${openingTag}${children.map(renderNode).join('')}</${tagName}>`;
};

const getStringAttribute = (value: unknown): string => {
	if (typeof value === 'string') return value;
	if (typeof value === 'number') return String(value);
	return '';
};

const getStringArrayAttribute = (value: unknown): string[] => {
	if (!Array.isArray(value)) return [];
	return value.map((entry) => getStringAttribute(entry)).filter((entry) => entry.trim().length > 0);
};

const createMathHtml = (latex: string, displayMode: boolean) => {
	try {
		return katex.renderToString(latex, {
			displayMode,
			throwOnError: false,
		});
	} catch {
		return `<code>${escapeHtml(latex)}</code>`;
	}
};

const createConfig = () => {
	let pollIndex = 0;
	let footnoteIndex = 0;

	const headingSchema = {
		...(Markdoc.nodes.heading as Record<string, unknown>),
		transform(node: any, config: any) {
			const level = Number(node.attributes.level || 1);
			const text = getNodeText(node.children);
			const slug = slugify(text);
			return new Markdoc.Tag(`h${level}`, { id: slug }, node.transformChildren(config));
		},
	};

	return {
		nodes: {
			...Markdoc.nodes,
			heading: headingSchema,
		},
		tags: {
			dividerBlock: {
				selfClosing: true,
				transform() {
					return new Markdoc.Tag('hr', { class: 'my-8 border-gray-200 dark:border-gray-800' }, []);
				},
			},
			footnote: {
				attributes: {
					marker: { type: String, required: false },
					note: { type: String, required: true },
				},
				transform(node: any) {
					footnoteIndex += 1;
					const marker = getStringAttribute(node.attributes.marker).trim() || String(footnoteIndex);
					const note = getStringAttribute(node.attributes.note).trim();
					const key = `footnote-${footnoteIndex}`;

					return new Markdoc.Tag('span', {
						class: 'article-footnote-inline',
						'data-footnote-key': key,
						'data-footnote-marker': marker,
						'data-footnote-note': note,
					}, [
						new Markdoc.Tag('sup', { class: 'article-footnote-ref' }, [
							new Markdoc.Tag('a', {
								href: `#${key}`,
								class: 'text-brandBlue no-underline',
								'aria-label': `Read footnote ${marker}`,
							}, [marker]),
						]),
					]);
				},
			},
			poll: {
				attributes: {
					question: { type: String, required: true },
					options: { type: Array, required: true },
					note: { type: String, required: false },
				},
				transform(node: any) {
					pollIndex += 1;
					const key = `poll-${pollIndex}`;
					const question = getStringAttribute(node.attributes.question).trim();
					const options = getStringArrayAttribute(node.attributes.options);
					const note = getStringAttribute(node.attributes.note).trim();
					const optionButtons = options.map((option, optionIndex) =>
						new Markdoc.Tag(
							'button',
							{
								type: 'button',
								class: 'group flex w-full flex-col items-start gap-2 border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-900 transition hover:border-brandBlue hover:bg-brandBlue/5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 disabled:cursor-wait disabled:opacity-70 dark:border-gray-800 dark:bg-[#080808] dark:text-gray-100 dark:hover:border-brandBlue dark:hover:bg-brandBlue/10',
								'data-poll-vote': '',
								'data-poll-option-index': String(optionIndex),
								'data-poll-option-label': option,
							},
							[
								new Markdoc.Tag('span', { class: 'min-w-0 font-semibold' }, [option]),
								new Markdoc.Tag('span', {
									class: 'shrink-0 text-[10px] font-bold tracking-widest text-gray-400 uppercase group-aria-pressed:text-brandBlue',
									'data-poll-action-label': '',
								}, ['Vote']),
							],
						),
					);
					const resultRows = options.map((option, optionIndex) =>
						new Markdoc.Tag(
							'div',
							{
								class: 'space-y-1',
								'data-poll-result-row': '',
								'data-poll-option-index': String(optionIndex),
							},
							[
								new Markdoc.Tag('div', { class: 'flex items-start justify-between gap-3 text-xs text-gray-500 dark:text-gray-400' }, [
									new Markdoc.Tag('span', { class: 'min-w-0' }, [option]),
									new Markdoc.Tag('span', { class: 'shrink-0', 'data-poll-result-label': '' }, ['0%']),
								]),
								new Markdoc.Tag('div', { class: 'h-2 overflow-hidden bg-gray-100 dark:bg-gray-900' }, [
									new Markdoc.Tag('div', {
										class: 'h-full bg-brandBlue transition-[width] duration-300',
										style: 'width: 0%',
										'data-poll-result-bar': '',
									}),
								]),
							],
						),
					);

					return new Markdoc.Tag('section', {
						class: 'article-poll my-8 border border-brandBlue/30 bg-brandBlue/5 p-4 sm:my-10 sm:p-5 dark:border-brandBlue/40 dark:bg-brandBlue/10',
						'data-poll-key': key,
						'data-poll-question': question,
						'data-poll-options': JSON.stringify(options),
						'data-poll-note': note,
					}, [
						question ? new Markdoc.Tag('h3', { class: 'text-xl font-bold leading-snug text-gray-900 dark:text-white' }, [question]) : '',
						new Markdoc.Tag('div', { class: 'mt-4 space-y-2', 'data-poll-options-list': '' }, optionButtons),
						new Markdoc.Tag('div', { class: 'mt-4 space-y-2', 'data-poll-results': '' }, resultRows),
						note ? new Markdoc.Tag('p', { class: 'mt-3 text-sm text-gray-500 dark:text-gray-400' }, [note]) : '',
						new Markdoc.Tag('p', { class: 'mt-3 text-xs text-gray-500 dark:text-gray-400', 'data-poll-status': '' }, ['Cast your vote to see results.']),
					]);
				},
			},
			imageFigure: {
				attributes: {
					image: { type: String, required: true },
					alt: { type: String, required: false },
					caption: { type: String, required: false },
					credit: { type: String, required: false },
					creditUrl: { type: String, required: false },
				},
				transform(node: any) {
					const image = getStringAttribute(node.attributes.image);
					const alt = getStringAttribute(node.attributes.alt) || 'Article image';
					const caption = getStringAttribute(node.attributes.caption);
					const credit = getStringAttribute(node.attributes.credit);
					const creditUrl = getStringAttribute(node.attributes.creditUrl);

					return new Markdoc.Tag('figure', { class: 'my-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800' }, [
						new Markdoc.Tag('img', { src: image, alt, class: 'h-auto w-full object-cover', loading: 'lazy' }, []),
						new Markdoc.Tag('div', { class: 'space-y-2 px-4 py-3' }, [
							caption ? new Markdoc.Tag('figcaption', { class: 'text-sm text-gray-500 dark:text-gray-400' }, [caption]) : '',
							credit ? new Markdoc.Tag('p', { class: 'text-xs tracking-wide text-gray-400 uppercase' }, [
								'Credit: ',
								creditUrl ? new Markdoc.Tag('a', { href: creditUrl, class: 'text-brandBlue underline underline-offset-4' }, [credit]) : credit,
							]) : '',
						]),
					]);
				},
			},
			audioEmbed: {
				attributes: {
					title: { type: String, required: false },
					sourceUrl: { type: String, required: true },
					caption: { type: String, required: false },
				},
				transform(node: any) {
					const title = getStringAttribute(node.attributes.title);
					const sourceUrl = getStringAttribute(node.attributes.sourceUrl);
					const caption = getStringAttribute(node.attributes.caption);

					return new Markdoc.Tag('figure', { class: 'my-8 rounded-2xl border border-gray-200 p-4 dark:border-gray-800' }, [
						title ? new Markdoc.Tag('p', { class: 'mb-3 text-sm font-bold text-gray-700 dark:text-gray-200' }, [title]) : '',
						sourceUrl ? new Markdoc.Tag('audio', { controls: true, class: 'w-full' }, [new Markdoc.Tag('source', { src: sourceUrl }, [])]) : new Markdoc.Tag('p', { class: 'rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400' }, ['Audio URL is missing.']),
						caption ? new Markdoc.Tag('figcaption', { class: 'mt-2 text-sm text-gray-500 dark:text-gray-400' }, [caption]) : '',
					]);
				},
			},
			videoEmbed: {
				attributes: {
					title: { type: String, required: false },
					sourceUrl: { type: String, required: true },
					caption: { type: String, required: false },
				},
				transform(node: any) {
					const title = getStringAttribute(node.attributes.title);
					const sourceUrl = getStringAttribute(node.attributes.sourceUrl);
					const caption = getStringAttribute(node.attributes.caption);

					return new Markdoc.Tag('figure', { class: 'my-8 overflow-hidden rounded-2xl border border-gray-200 p-3 dark:border-gray-800' }, [
						title ? new Markdoc.Tag('p', { class: 'mb-3 text-sm font-bold text-gray-700 dark:text-gray-200' }, [title]) : '',
						sourceUrl ? new Markdoc.Tag('video', { controls: true, class: 'w-full rounded-xl border border-gray-200 bg-black dark:border-gray-800' }, [new Markdoc.Tag('source', { src: sourceUrl }, [])]) : new Markdoc.Tag('p', { class: 'rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400' }, ['Video URL is missing.']),
						caption ? new Markdoc.Tag('figcaption', { class: 'mt-2 text-sm text-gray-500 dark:text-gray-400' }, [caption]) : '',
					]);
				},
			},
			formula: {
				attributes: {
					label: { type: String, required: false },
					latex: { type: String, required: true },
					displayMode: { type: Boolean, required: false },
				},
				transform(node: any) {
					const label = getStringAttribute(node.attributes.label);
					const latex = getStringAttribute(node.attributes.latex);
					const displayMode = node.attributes.displayMode !== false;
					const mathHtml = createMathHtml(latex, displayMode);

					return new Markdoc.Tag('figure', { class: 'my-8 rounded-2xl border border-gray-200 p-4 dark:border-gray-800' }, [
						label ? new Markdoc.Tag('p', { class: 'mb-3 text-sm font-bold text-gray-700 dark:text-gray-200' }, [label]) : '',
						new Markdoc.Tag('div', { class: 'overflow-x-auto rounded-xl bg-gray-50 p-4 dark:bg-gray-950' }, [{ __html: mathHtml }]),
					]);
				},
			},
			button: {
				attributes: {
					label: { type: String, required: true },
					href: { type: String, required: true },
					variant: { type: String, required: false },
					external: { type: Boolean, required: false },
				},
				transform(node: any) {
					const label = getStringAttribute(node.attributes.label) || 'Open';
					const href = getStringAttribute(node.attributes.href) || '#';
					const variant = getStringAttribute(node.attributes.variant);
					const external = node.attributes.external !== false;
					const variantClass = variant === 'secondary' ? 'ui-btn-secondary' : variant === 'neutral' ? 'ui-btn-neutral' : 'ui-btn-primary';

					return new Markdoc.Tag('div', { class: 'my-8' }, [
						new Markdoc.Tag('a', {
							href,
							class: `ui-btn ${variantClass}`,
							target: external ? '_blank' : undefined,
							rel: external ? 'noreferrer' : undefined,
						}, [label]),
					]);
				},
			},
			newsletterCta: {
				attributes: {
					heading: { type: String, required: false },
					description: { type: String, required: false },
					buttonLabel: { type: String, required: false },
					buttonUrl: { type: String, required: false },
				},
				transform(node: any) {
					const heading = getStringAttribute(node.attributes.heading) || 'Subscribe to the newsletter';
					const description = getStringAttribute(node.attributes.description);
					const buttonLabel = getStringAttribute(node.attributes.buttonLabel) || 'Subscribe';
					const buttonUrl = getStringAttribute(node.attributes.buttonUrl);
					const formId = `article-newsletter-${slugify(heading || 'newsletter')}-${Math.random().toString(36).slice(2, 8)}`;

					return new Markdoc.Tag('section', { class: 'article-newsletter my-12 grid gap-5 border-y border-brandBlue/30 bg-brandBlue/5 px-5 py-7 sm:grid-cols-[minmax(0,1fr)_minmax(260px,360px)] sm:items-center dark:border-brandBlue/40 dark:bg-brandBlue/10' }, [
						new Markdoc.Tag('div', {}, [
							new Markdoc.Tag('p', { class: 'text-[11px] font-bold tracking-[0.22em] text-brandBlue uppercase' }, ['Newsletter']),
							new Markdoc.Tag('h3', { class: 'mt-2 text-2xl font-bold leading-tight text-gray-900 dark:text-white' }, [heading]),
							description ? new Markdoc.Tag('p', { class: 'mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300' }, [description]) : new Markdoc.Tag('p', { class: 'mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300' }, ['Get new essays and publishing notes by email.']),
						]),
						buttonUrl
							? new Markdoc.Tag('a', { href: buttonUrl, class: 'ui-btn ui-btn-primary mt-4' }, [buttonLabel])
							: new Markdoc.Tag('form', {
								class: 'flex flex-col gap-2',
								'data-inline-newsletter-form': '',
								'aria-label': 'Inline newsletter signup',
								id: formId,
							}, [
								new Markdoc.Tag('input', {
									type: 'email',
									required: true,
									placeholder: 'you@example.com',
									class: 'w-full border border-gray-300 bg-white px-4 py-3 text-sm focus:border-brandBlue focus:outline-none dark:border-gray-700 dark:bg-black',
									'data-newsletter-email': '',
								}),
								new Markdoc.Tag('button', {
									type: 'submit',
									class: 'ui-btn ui-btn-primary w-full rounded-none',
								}, [buttonLabel]),
								new Markdoc.Tag('p', {
									class: 'min-h-5 text-sm text-gray-600 dark:text-gray-300',
									'data-newsletter-status': '',
								}),
							]),
					]);
				},
			},
			htmlCanvas: {
				attributes: {
					title: { type: String, required: false },
					html: { type: String, required: true },
					height: { type: String, required: false },
					caption: { type: String, required: false },
				},
				transform(node: any) {
					const title = getStringAttribute(node.attributes.title);
					const html = getStringAttribute(node.attributes.html);
					const height = Math.max(220, Number(node.attributes.height) || 380);
					const caption = getStringAttribute(node.attributes.caption);

					return new Markdoc.Tag('figure', { class: 'my-8 overflow-hidden rounded-2xl border border-gray-200 p-3 dark:border-gray-800' }, [
						title ? new Markdoc.Tag('p', { class: 'mb-3 text-sm font-bold text-gray-700 dark:text-gray-200' }, [title]) : '',
						new Markdoc.Tag('iframe', {
							title: title || 'HTML canvas preview',
							srcdoc: html,
							sandbox: 'allow-scripts allow-same-origin',
							class: 'w-full rounded-xl border border-gray-200 bg-white dark:border-gray-800',
							style: `height: ${height}px`,
						}, []),
						caption ? new Markdoc.Tag('figcaption', { class: 'mt-2 text-sm text-gray-500 dark:text-gray-400' }, [caption]) : '',
					]);
				},
			},
			embedFrame: {
				attributes: {
					title: { type: String, required: false },
					url: { type: String, required: true },
					height: { type: String, required: false },
					caption: { type: String, required: false },
				},
				transform(node: any) {
					const title = getStringAttribute(node.attributes.title);
					const url = getStringAttribute(node.attributes.url);
					const height = Math.max(260, Number(node.attributes.height) || 420);
					const caption = getStringAttribute(node.attributes.caption);

					return new Markdoc.Tag('figure', { class: 'my-8 overflow-hidden rounded-2xl border border-gray-200 p-3 dark:border-gray-800' }, [
						title ? new Markdoc.Tag('p', { class: 'mb-3 text-sm font-bold text-gray-700 dark:text-gray-200' }, [title]) : '',
						url ? new Markdoc.Tag('iframe', {
							title: title || 'Embedded visual',
							src: url,
							sandbox: 'allow-same-origin allow-scripts allow-popups allow-forms',
							loading: 'lazy',
							class: 'w-full rounded-xl border border-gray-200 bg-white dark:border-gray-800',
							style: `height: ${height}px`,
						}, []) : new Markdoc.Tag('p', { class: 'rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400' }, ['Embed URL is missing.']),
						caption ? new Markdoc.Tag('figcaption', { class: 'mt-2 text-sm text-gray-500 dark:text-gray-400' }, [caption]) : '',
					]);
				},
			},
			mermaidDiagram: {
				attributes: {
					title: { type: String, required: false },
					diagram: { type: String, required: true },
					caption: { type: String, required: false },
				},
				transform(node: any) {
					const title = getStringAttribute(node.attributes.title);
					const diagram = getStringAttribute(node.attributes.diagram);
					const caption = getStringAttribute(node.attributes.caption);

					return new Markdoc.Tag('figure', { class: 'my-8 overflow-hidden rounded-2xl border border-gray-200 p-3 dark:border-gray-800' }, [
						title ? new Markdoc.Tag('p', { class: 'mb-3 text-sm font-bold text-gray-700 dark:text-gray-200' }, [title]) : '',
						diagram ? new Markdoc.Tag('pre', { class: 'mermaid overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-black' }, [diagram]) : new Markdoc.Tag('p', { class: 'rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400' }, ['Mermaid syntax is missing.']),
						caption ? new Markdoc.Tag('figcaption', { class: 'mt-2 text-sm text-gray-500 dark:text-gray-400' }, [caption]) : '',
					]);
				},
			},
			referencesList: {
				attributes: {
					title: { type: String, required: false },
					items: { type: Array, required: true },
				},
				transform(node: any) {
					const title = getStringAttribute(node.attributes.title) || 'References';
					const items = getStringArrayAttribute(node.attributes.items);

					return new Markdoc.Tag('section', { class: 'my-10' }, [
						new Markdoc.Tag('h3', { class: 'text-2xl font-bold tracking-tight' }, [title]),
						items.length > 0
							? new Markdoc.Tag('ol', { class: 'references-list mt-4' }, items.map((item) => new Markdoc.Tag('li', {}, [item])))
							: new Markdoc.Tag('p', { class: 'mt-3 text-sm text-gray-500 dark:text-gray-400' }, ['No references added yet.']),
					]);
				},
			},
		},
	};
};

const collectRenderData = (node: RenderableNode, output: RenderedArticleContent) => {
	if (typeof node === 'string' || typeof node === 'number' || node === null || node === undefined) return;
	if (Array.isArray(node)) {
		for (const child of node) collectRenderData(child, output);
		return;
	}
	if (typeof node === 'object' && '__html' in node) return;
	if (typeof node !== 'object' || !node.name) return;

	const tagName = String(node.name);
	if (/^h[1-6]$/.test(tagName)) {
		const text = getNodeText(node.children || []);
		if (text.trim()) {
			output.headings.push({ text: text.trim(), slug: slugify(text), level: Number(tagName.slice(1)) });
		}
	}

	if (tagName === 'section' && typeof node.attributes?.['data-poll-key'] === 'string') {
		const options = getStringArrayAttribute(JSON.parse(String(node.attributes?.['data-poll-options'] || '[]')));
		const question = getStringAttribute(node.attributes?.['data-poll-question']);
		const note = getStringAttribute(node.attributes?.['data-poll-note']);
		const key = String(node.attributes?.['data-poll-key']);
		output.polls.push({ key, index: output.polls.length + 1, question, options, note });
	}

	if (typeof node.attributes?.['data-footnote-key'] === 'string') {
		output.footnotes.push({
			key: String(node.attributes['data-footnote-key']),
			index: output.footnotes.length + 1,
			marker: String(node.attributes['data-footnote-marker'] || ''),
			note: String(node.attributes['data-footnote-note'] || '').trim(),
		});
	}

	for (const child of node.children || []) collectRenderData(child, output);
};

export const renderArticleContent = (body: string): RenderedArticleContent => {
	const config = createConfig();
	const parsed = Markdoc.parse(body || '');
	const transformed = Markdoc.transform(parsed, config);
	const nodes = Array.isArray(transformed) ? transformed : [transformed];

	const output: RenderedArticleContent = {
		html: '',
		headings: [],
		polls: [],
		footnotes: [],
	};

	for (const node of nodes) collectRenderData(node, output);
	output.html = nodes.map(renderNode).join('');
	return output;
};
