import { collection, component, config, fields, singleton } from '@keystatic/core';

const isProduction = process.env.NODE_ENV === 'production';
const inferredVercelRepo = process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
	? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
	: '';
// Keep a deterministic fallback so the browser bundle and API agree on storage mode in production.
const fallbackGithubRepo = 'youngseeker/afraid-antimatter';
const githubRepo = process.env.KEYSTATIC_GITHUB_REPO || inferredVercelRepo || fallbackGithubRepo;
const githubClientId = process.env.KEYSTATIC_GITHUB_CLIENT_ID || '';
const githubClientSecret = process.env.KEYSTATIC_GITHUB_CLIENT_SECRET || '';
const keystaticSecret = process.env.KEYSTATIC_SECRET || '';

const getGithubRepoConfig = (repoValue: string) => {
	const [owner, ...nameParts] = repoValue.split('/');
	const name = nameParts.join('/');

	if (!owner || !name) {
		throw new Error('KEYSTATIC_GITHUB_REPO must be in owner/name format when using Keystatic GitHub storage.');
	}

	return { owner, name };
};

const hasGithubRepo = Boolean(githubRepo && githubRepo.includes('/'));

const storage = isProduction && hasGithubRepo
	? ({
			kind: 'github',
			repo: getGithubRepoConfig(githubRepo),
	  } as const)
	: ({
		kind: 'local',
	  } as const);

export default config({
	storage,
	ui: {
		// Enable custom CSS for enhanced mobile and desktop UX
		brand: {
			name: 'Adeyemi Brand',
		},
	},
	collections: {
		posts: collection({
			label: '📝 Articles',
			slugField: 'title',
			path: 'src/content/posts/*',
			format: { contentField: 'content' },
			previewUrl: '/garden/{slug}',
			schema: {
				title: fields.slug({ name: { label: 'Article title' } }),
				status: fields.select({
					label: '📌 Status',
					defaultValue: 'draft',
					description: 'Draft: hidden | Published: visible | Scheduled: auto-publish at date',
					options: [
						{ label: '✏️  Draft (hidden)', value: 'draft' },
						{ label: '✅ Published (live)', value: 'published' },
						{ label: '⏰ Scheduled (auto-publish)', value: 'scheduled' },
					],
				}),
				scheduledFor: fields.datetime({
					label: '⏰ Schedule publish time',
					description: '(Used only if status is Scheduled) Time in UTC',
					validation: { isRequired: false },
				}),
				featured: fields.checkbox({
					label: '⭐ Feature on homepage',
					defaultValue: false,
				}),
				publishedAt: fields.date({
					label: '📅 Publish date',
					description: 'Shows on article listing and detail page',
					defaultValue: { kind: 'today' },
				}),
				excerpt: fields.text({
					label: '💬 Short excerpt (60–100 chars)',
					description: 'Shown in article cards and search results; make it compelling',
					multiline: false,
				}),
				coverImage: fields.image({
					label: '🖼️  Cover image (recommended)',
					description: '16:10 aspect ratio works best (e.g., 1600×1000px). Leave blank for text-only article.',
					directory: 'public/uploads/posts',
					publicPath: '/uploads/posts/',
				}),
				coverImageCredit: fields.text({
					label: '🏷️  Image credit (photographer/source)',
					description: 'E.g., "Photo by Jane Doe" or "Unsplash"',
					validation: { isRequired: false },
				}),
				coverImageCreditUrl: fields.url({
					label: '🔗 Image credit URL',
					description: 'Link to photographer profile or source',
					validation: { isRequired: false },
				}),
				author: fields.text({
					label: '✍️  Author name',
					defaultValue: 'Adeyemi Adeniji',
				}),
				tags: fields.array(
					fields.text({ label: 'Tag' }),
					{
						label: '🏷️  Tags (3-5 recommended)',
						itemLabel: (props) => props.value || 'New tag',
						description: 'Topics, tools, concepts covered in this article',
					}
				),
				canonicalUrl: fields.url({
					label: '🔗 Canonical URL',
					description: 'Use if this article is published elsewhere first (SEO)',
					validation: { isRequired: false },
				}),
				noIndex: fields.checkbox({
					label: '🚫 Hide from search engines (noindex)',
					description: 'Check if this is draft, private, or mirrored content',
					defaultValue: false,
				}),
				content: fields.document({
					label: '✍️  Article content',
					description: 'Use headings (h2, h3), bold, italic, lists, links, images, and component blocks below',
					formatting: {
						inlineMarks: {
							bold: true,
							italic: true,
							strikethrough: true,
							code: true,
							underline: true,
							superscript: true,
							subscript: true,
						},
						listTypes: true,
						headingLevels: [2, 3, 4],
						blockTypes: true,
						softBreaks: true,
						alignment: {
							center: true,
							end: true,
						},
					},
					dividers: true,
					links: true,
					tables: true,
					componentBlocks: {
						dividerBlock: component({
							label: '⎯️  Divider (visual separator)',
							schema: {},
							preview: () => '---',
						}),
						footnote: component({
							label: '📌 Footnote / endnote',
							schema: {
								marker: fields.text({ label: 'Marker (e.g., "1", "a", "*")', defaultValue: '1' }),
								note: fields.text({ label: 'Footnote text', multiline: true }),
							},
							preview: (props) => `[${props.marker}] ${props.note?.slice(0, 40)}...` || 'Footnote',
						}),
						poll: component({
							label: '📊 Poll / survey',
							schema: {
								question: fields.text({ label: 'Poll question' }),
								options: fields.array(fields.text({ label: 'Option' }), {
									label: 'Options',
									itemLabel: (props) => props.value || 'New option',
								}),
								note: fields.text({ label: 'Optional poll context/note', multiline: true, validation: { isRequired: false } }),
							},
							preview: (props) => `Poll: ${props.question}` || 'Poll',
						}),
						imageFigure: component({
							label: '🖼️  Image with caption & credit',
							schema: {
								image: fields.image({
									label: 'Image',
									directory: 'public/uploads/posts',
									publicPath: '/uploads/posts/',
								}),
								alt: fields.text({ label: 'Alt text (accessibility + SEO)' }),
								caption: fields.text({ label: 'Caption (shown below image)', multiline: true, validation: { isRequired: false } }),
								credit: fields.text({ label: 'Credit/attribution', validation: { isRequired: false } }),
								creditUrl: fields.url({ label: 'Credit link', validation: { isRequired: false } }),
							},
							preview: (props) => `Image: ${props.alt?.slice(0, 30)}...` || 'Image',
						}),
						videoEmbed: component({
							label: '🎬 Video embed (YouTube/Vimeo)',
							schema: {
								title: fields.text({ label: 'Video title', validation: { isRequired: false } }),
								sourceUrl: fields.url({ label: 'Video URL (YouTube, Vimeo, etc.)' }),
								caption: fields.text({ label: 'Caption', multiline: true, validation: { isRequired: false } }),
							},
							preview: (props) => `Video: ${props.title || props.sourceUrl?.slice(0, 30)}...` || 'Video',
						}),
						audioEmbed: component({
							label: '🎙️  Audio embed',
							schema: {
								title: fields.text({ label: 'Audio title', validation: { isRequired: false } }),
								sourceUrl: fields.url({ label: 'Audio URL (MP3, Soundcloud, etc.)' }),
								caption: fields.text({ label: 'Caption', multiline: true, validation: { isRequired: false } }),
							},
							preview: (props) => `Audio: ${props.title || props.sourceUrl?.slice(0, 30)}...` || 'Audio',
						}),
						formula: component({
							label: '∑ Math formula (LaTeX)',
							schema: {
								label: fields.text({ label: 'Formula label (optional)', validation: { isRequired: false } }),
								latex: fields.text({ label: 'LaTeX code', multiline: true }),
								displayMode: fields.checkbox({ label: 'Display mode (centered, large)', defaultValue: true }),
							},
							preview: (props) => `Formula: ${props.label || props.latex?.slice(0, 30)}...` || 'Formula',
						}),
						button: component({
							label: '🔘 Button (CTA)',
							schema: {
								label: fields.text({ label: 'Button text' }),
								href: fields.url({ label: 'Button URL' }),
								variant: fields.select({
									label: 'Button style',
									defaultValue: 'primary',
									options: [
										{ label: '🔵 Primary (blue, prominent)', value: 'primary' },
										{ label: '⚪ Secondary (outline)', value: 'secondary' },
										{ label: '⚫ Neutral (minimal)', value: 'neutral' },
									],
								}),
								external: fields.checkbox({ label: 'Open link in new tab', defaultValue: true }),
							},
							preview: (props) => `Button: ${props.label}` || 'Button',
						}),
						newsletterCta: component({
							label: '📬 Newsletter subscription CTA',
							schema: {
								heading: fields.text({ label: 'CTA heading', defaultValue: 'Subscribe to the newsletter' }),
								description: fields.text({ label: 'CTA description', multiline: true }),
								buttonLabel: fields.text({ label: 'Button label', defaultValue: 'Subscribe' }),
								buttonUrl: fields.url({ label: 'Form action URL (optional)', validation: { isRequired: false } }),
							},
							preview: (props) => `CTA: ${props.heading}` || 'Newsletter CTA',
						}),
						callout: component({
							label: '💡 Callout box (highlight/note)',
							schema: {
								type: fields.select({
									label: 'Callout type',
									defaultValue: 'info',
									options: [
										{ label: 'ℹ️  Info', value: 'info' },
										{ label: '⚠️  Warning', value: 'warning' },
										{ label: '✅ Success', value: 'success' },
										{ label: '❌ Error', value: 'error' },
									],
								}),
								text: fields.text({ label: 'Callout text', multiline: true }),
							},
							preview: (props) => `${props.type?.toUpperCase()}: ${props.text?.slice(0, 30)}...` || 'Callout',
						}),
					},
					images: {
						directory: 'public/uploads/posts',
						publicPath: '/uploads/posts/',
					},
				}),
			},
		}),
	},
	singletons: {
		site: singleton({
			label: '⚙️  Site settings',
			path: 'src/content/site',
			format: { data: 'json' },
			schema: {
				tagline: fields.text({ label: 'Site tagline' }),
				description: fields.text({ label: 'Site description', multiline: true }),
			},
		}),
	},
});
