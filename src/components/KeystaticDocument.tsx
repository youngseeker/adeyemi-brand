import type { ReactNode } from 'react';
import { DocumentRenderer } from '@keystatic/core/renderer';
import katex from 'katex';

type KeystaticNode = {
	children?: KeystaticNode[];
	text?: string;
	[key: string]: unknown;
};

type Props = {
	document: KeystaticNode[];
};

const headingClasses: Record<number, string> = {
	1: 'mt-10 text-3xl font-bold tracking-tight sm:text-4xl',
	2: 'mt-8 text-2xl font-bold tracking-tight sm:text-3xl',
	3: 'mt-7 text-xl font-bold tracking-tight sm:text-2xl',
	4: 'mt-6 text-lg font-bold tracking-tight sm:text-xl',
	5: 'mt-5 text-lg font-bold tracking-tight',
	6: 'mt-4 text-base font-bold tracking-tight',
};

export default function KeystaticDocument({ document }: Props) {
	const renderFormula = (latex: unknown, displayMode: unknown) => {
		if (typeof latex !== 'string' || !latex.trim()) {
			return <p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Formula is missing.</p>;
		}

		try {
			const html = katex.renderToString(latex, {
				displayMode: displayMode !== false,
				throwOnError: false,
			});

			return <span dangerouslySetInnerHTML={{ __html: html }} />;
		} catch {
			return <code className="rounded bg-gray-100 px-2 py-1 font-mono text-xs dark:bg-gray-900">{latex}</code>;
		}
	};

	return (
		<div className="article-content space-y-4 text-base leading-7 text-gray-700 sm:space-y-5 sm:text-lg sm:leading-relaxed dark:text-gray-200">
			<DocumentRenderer
				document={document as any}
				componentBlocks={{
					dividerBlock: () => <hr className="my-8 border-gray-200 dark:border-gray-800" />,
					footnote: ({ marker, note }) => (
						<aside className="my-8 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
							<p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Footnote {typeof marker === 'string' && marker.trim() ? marker : ''}</p>
							<p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{typeof note === 'string' ? note : ''}</p>
						</aside>
					),
					poll: ({ question, options, note }) => (
						<section className="my-8 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
							{question && <h3 className="text-lg font-bold">{question}</h3>}
							{Array.isArray(options) && options.length > 0 ? (
								<div className="mt-4 space-y-2">
									{options.filter((option: unknown) => typeof option === 'string' && option.trim()).map((option: string, index: number) => (
										<div key={`poll-option-${index}`} className="rounded-xl border border-gray-200 px-4 py-3 text-sm dark:border-gray-800">
											{option.trim()}
										</div>
									))}
								</div>
							) : (
								<p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Add some options to turn this into a poll.</p>
							)}
							{note && <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{note}</p>}
						</section>
					),
					imageFigure: ({ image, alt, caption, credit, creditUrl }) => {
						const src = typeof image === 'object' && image && 'src' in image ? String((image as { src?: unknown }).src || '') : typeof image === 'string' ? image : '';
						return (
							<figure className="my-8 overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800">
								{src ? <img src={src} alt={typeof alt === 'string' ? alt : 'Article image'} className="h-auto w-full object-cover" loading="lazy" /> : <div className="px-4 py-10 text-sm text-gray-500 dark:text-gray-400">Image is missing.</div>}
								<div className="space-y-2 px-4 py-3">
									{caption && <figcaption className="text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>}
									{credit && (
										<p className="text-xs tracking-wide text-gray-400 uppercase">
											Credit:{' '}
											{creditUrl && typeof creditUrl === 'string' ? (
												<a href={creditUrl} className="text-brandBlue underline underline-offset-4">{credit}</a>
											) : (
												credit
											)}
										</p>
									)}
								</div>
							</figure>
						);
					},
					audioEmbed: ({ title, sourceUrl, caption }) => (
						<figure className="my-8 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
							{title && <p className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">{title}</p>}
							{typeof sourceUrl === 'string' && sourceUrl ? (
								<audio controls className="w-full">
									<source src={sourceUrl} />
									Your browser does not support audio playback.
								</audio>
							) : (
								<p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Audio URL is missing.</p>
							)}
							{caption && <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>}
						</figure>
					),
					videoEmbed: ({ title, sourceUrl, caption }) => (
						<figure className="my-8 overflow-hidden rounded-2xl border border-gray-200 p-3 dark:border-gray-800">
							{title && <p className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">{title}</p>}
							{typeof sourceUrl === 'string' && sourceUrl ? (
								<video controls className="w-full rounded-xl border border-gray-200 bg-black dark:border-gray-800">
									<source src={sourceUrl} />
									Your browser does not support video playback.
								</video>
							) : (
								<p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">Video URL is missing.</p>
							)}
							{caption && <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>}
						</figure>
					),
					formula: ({ label, latex, displayMode }) => (
						<figure className="my-8 rounded-2xl border border-gray-200 p-4 dark:border-gray-800">
							{label && <p className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">{label}</p>}
							<div className="overflow-x-auto rounded-xl bg-gray-50 p-4 dark:bg-gray-950">{renderFormula(latex, displayMode)}</div>
						</figure>
					),
					button: ({ label, href, variant, external }) => (
						<div className="my-8">
							<a
								href={typeof href === 'string' ? href : '#'}
								className={`ui-btn ${variant === 'secondary' ? 'ui-btn-secondary' : variant === 'neutral' ? 'ui-btn-neutral' : 'ui-btn-primary'}`}
								target={external ? '_blank' : undefined}
								rel={external ? 'noreferrer' : undefined}
							>
								{typeof label === 'string' ? label : 'Open'}
							</a>
						</div>
					),
					newsletterCta: ({ heading, description, buttonLabel, buttonUrl }) => (
						<section className="my-8 rounded-2xl border border-brandBlue/30 bg-brandBlue/5 p-5 dark:bg-brandBlue/10">
							{heading && <h3 className="text-lg font-bold text-gray-900 dark:text-white">{heading}</h3>}
							{description && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{description}</p>}
							{buttonUrl && typeof buttonUrl === 'string' && (
								<a href={buttonUrl} className="ui-btn ui-btn-primary mt-4">
									{typeof buttonLabel === 'string' && buttonLabel.trim() ? buttonLabel : 'Subscribe'}
								</a>
							)}
						</section>
					),
					htmlCanvas: ({ title, html, height, caption }) => (
						<figure className="my-8 overflow-hidden rounded-2xl border border-gray-200 p-3 dark:border-gray-800">
							{title && <p className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">{title}</p>}
							<iframe
								title={title || 'HTML canvas preview'}
								srcDoc={typeof html === 'string' ? html : ''}
								sandbox="allow-scripts allow-same-origin"
								className="w-full rounded-xl border border-gray-200 bg-white dark:border-gray-800"
								style={{ height: `${Math.max(220, Number(height) || 380)}px` }}
							/>
							{caption && <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>}
						</figure>
					),
					embedFrame: ({ title, url, height, caption }) => (
						<figure className="my-8 overflow-hidden rounded-2xl border border-gray-200 p-3 dark:border-gray-800">
							{title && <p className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">{title}</p>}
							{typeof url === 'string' && url ? (
								<iframe
									title={title || 'Embedded visual'}
									src={url}
									sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
									loading="lazy"
									className="w-full rounded-xl border border-gray-200 bg-white dark:border-gray-800"
									style={{ height: `${Math.max(260, Number(height) || 420)}px` }}
								/>
							) : (
								<p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
									Embed URL is missing.
								</p>
							)}
							{caption && <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>}
						</figure>
					),
					mermaidDiagram: ({ title, diagram, caption }) => (
						<figure className="my-8 overflow-hidden rounded-2xl border border-gray-200 p-3 dark:border-gray-800">
							{title && <p className="mb-3 text-sm font-bold text-gray-700 dark:text-gray-200">{title}</p>}
							{typeof diagram === 'string' && diagram.trim() ? (
								<pre className="mermaid overflow-x-auto rounded-xl border border-gray-200 bg-white p-4 text-sm dark:border-gray-800 dark:bg-black">
									{diagram}
								</pre>
							) : (
								<p className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
									Mermaid syntax is missing.
								</p>
							)}
							{caption && <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">{caption}</figcaption>}
						</figure>
					),
					referencesList: ({ title, items }) => (
						<section className="my-10">
							<h3 className="text-2xl font-bold tracking-tight">{typeof title === 'string' && title.trim() ? title : 'References'}</h3>
							{Array.isArray(items) && items.length > 0 ? (
								<ol className="references-list mt-4">
									{items
										.filter((entry: unknown) => typeof entry === 'string' && entry.trim())
										.map((entry: string, index: number) => (
											<li key={`reference-${index}`}>{entry.trim()}</li>
										))}
								</ol>
							) : (
								<p className="mt-3 text-sm text-gray-500 dark:text-gray-400">No references added yet.</p>
							)}
						</section>
					),
				}}
				renderers={{
					inline: {
						link: ({ children, href }) => (
							<a href={href} className="font-semibold text-brandBlue underline decoration-brandBlue/40 underline-offset-4 hover:decoration-brandBlue">
								{children}
							</a>
						),
							strikethrough: ({ children }) => <s>{children}</s>,
						code: ({ children }) => (
							<code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs sm:text-sm dark:bg-gray-900">{children}</code>
						),
					},
					block: {
						paragraph: ({ children, textAlign }) => (
							<p className="my-3 wrap-break-word" style={{ textAlign }}>
								{children}
							</p>
						),
						heading: ({ level, children, textAlign }) => {
							const Tag = `h${level}` as keyof JSX.IntrinsicElements;
							return (
								<Tag className={headingClasses[level] ?? headingClasses[2]} style={{ textAlign }}>
									{children}
								</Tag>
							);
						},
						blockquote: ({ children }) => (
							<blockquote className="my-6 border-l-4 border-brandBlue pl-5 text-base text-gray-600 italic sm:text-lg dark:text-gray-300">
								{children}
							</blockquote>
						),
						code: ({ children, language }) => {
							const normalizedLanguage = String(language || '').toLowerCase();
							const supportsLiveHtmlPreview = normalizedLanguage === 'html' || normalizedLanguage === 'xml' || normalizedLanguage === 'svg';
							const languageClass = normalizedLanguage ? `language-${normalizedLanguage}` : undefined;
							return (
								<div className="my-6 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
									<div className="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-800 dark:bg-gray-900">
										<span className="text-[10px] font-bold tracking-widest text-gray-500 uppercase">{normalizedLanguage || 'code'}</span>
									</div>
									<pre className="overflow-x-auto bg-gray-50 p-4 text-xs sm:text-sm dark:bg-black">
										<code className={languageClass}>{children}</code>
									</pre>
									{supportsLiveHtmlPreview && (
										<div className="border-t border-gray-200 bg-white p-2 dark:border-gray-800 dark:bg-[#0b0b0b]">
											<p className="mb-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">Live Preview</p>
											<iframe
												title="HTML code preview"
												srcDoc={children}
												sandbox="allow-scripts allow-same-origin"
												className="h-72 w-full rounded-lg border border-gray-200 bg-white dark:border-gray-800"
											/>
										</div>
									)}
								</div>
							);
						},
						list: ({ type, children }) => {
							if (type === 'ordered') {
								return <ol className="article-ordered-list my-4 list-decimal space-y-1 pl-7 marker:font-semibold marker:text-brandBlue">{children as ReactNode}</ol>;
							}
							return <ul className="article-unordered-list my-4 list-disc space-y-1 pl-7 marker:text-brandBlue">{children as ReactNode}</ul>;
						},
						image: ({ src, alt, title }) => (
							<figure className="my-8">
								<img src={src} alt={alt || title || 'Article image'} className="w-full rounded-2xl border border-gray-200 dark:border-gray-800" loading="lazy" />
								{title && <figcaption className="mt-2 text-sm text-gray-500 dark:text-gray-400">{title}</figcaption>}
							</figure>
						),
						divider: () => <hr className="my-8 border-gray-200 dark:border-gray-800" />,
							table: ({ head, body }) => (
							<div className="my-6 overflow-x-auto">
									<table className="min-w-full border-collapse overflow-hidden rounded-xl border border-gray-200 text-xs sm:text-sm dark:border-gray-800">
									{head && (
										<thead className="bg-gray-50 dark:bg-gray-900">
											<tr>
												{head.map((cell, index) => (
													<th key={`head-${index}`} className="border-b border-gray-200 px-4 py-2 text-left font-bold dark:border-gray-800" colSpan={cell.colSpan} rowSpan={cell.rowSpan}>
														{cell.children}
													</th>
												))}
											</tr>
										</thead>
									)}
									<tbody>
										{body.map((row, rowIndex) => (
											<tr key={`row-${rowIndex}`}>
												{row.map((cell, colIndex) => (
													<td key={`cell-${rowIndex}-${colIndex}`} className="border-b border-gray-100 px-4 py-2 align-top dark:border-gray-900" colSpan={cell.colSpan} rowSpan={cell.rowSpan}>
														{cell.children}
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>
						),
					},
				}}
			/>
		</div>
	);
}