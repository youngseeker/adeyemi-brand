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
	collections: {
		posts: collection({
			label: 'Posts',
			slugField: 'title',
			path: 'src/content/posts/*',
			format: { contentField: 'content' },
			schema: {
				title: fields.slug({ name: { label: 'Title' } }),
				status: fields.select({
					label: 'Publishing status',
					defaultValue: 'published',
					description: 'Set to Draft to unpublish, or Scheduled to auto-publish later.',
					options: [
						{ label: 'Draft', value: 'draft' },
						{ label: 'Published', value: 'published' },
						{ label: 'Scheduled', value: 'scheduled' },
					],
				}),
				scheduledFor: fields.datetime({
					label: 'Schedule publish time',
					description: 'Used when status is Scheduled. Time is interpreted in UTC.',
					validation: { isRequired: false },
				}),
				featured: fields.checkbox({
					label: 'Featured article',
					defaultValue: false,
				}),
				coverImage: fields.image({
					label: 'Cover image',
					directory: 'public/uploads/posts',
					publicPath: '/uploads/posts/',
				}),
				publishedAt: fields.date({
					label: 'Publish date',
					defaultValue: { kind: 'today' },
				}),
				canonicalUrl: fields.url({
					label: 'Canonical URL',
					description: 'Use when this article is mirrored or syndicated elsewhere.',
					validation: { isRequired: false },
				}),
				noIndex: fields.checkbox({
					label: 'Hide from search engines',
					defaultValue: false,
				}),
				excerpt: fields.text({
					label: 'Excerpt',
					multiline: true,
				}),
				author: fields.text({
					label: 'Author',
					defaultValue: 'Adeyemi Adeniji',
				}),
				coverImageCredit: fields.text({
					label: 'Cover image credit',
					description: 'Photographer, artist, or source credit for the cover image.',
					validation: { isRequired: false },
				}),
				coverImageCreditUrl: fields.url({
					label: 'Cover image credit URL',
					description: 'Optional source link for the cover image credit.',
					validation: { isRequired: false },
				}),
				tags: fields.array(
					fields.text({ label: 'Tag' }),
					{
						label: 'Tags',
						itemLabel: (props) => props.value || 'Tag',
					}
				),
				content: fields.document({
					label: 'Content',
					formatting: {
						inlineMarks: {
							bold: true,
							italic: true,
							strikethrough: true,
							code: true,
						},
						listTypes: true,
						headingLevels: true,
						blockTypes: true,
						softBreaks: true,
						alignment: {
							center: true,
							end: true,
						},
					},
					dividers: true,
					links: true,
					componentBlocks: {
						dividerBlock: component({
							label: 'Divider',
							schema: {},
							preview: () => null,
						}),
						footnote: component({
							label: 'Footnote',
							schema: {
								marker: fields.text({ label: 'Marker', defaultValue: '1' }),
								note: fields.text({ label: 'Note', multiline: true }),
							},
							preview: () => null,
						}),
						poll: component({
							label: 'Poll',
							schema: {
								question: fields.text({ label: 'Question' }),
								options: fields.array(fields.text({ label: 'Option' }), {
									label: 'Options',
									itemLabel: (props) => props.value || 'Option',
								}),
								note: fields.text({ label: 'Note', multiline: true, validation: { isRequired: false } }),
							},
							preview: () => null,
						}),
						imageFigure: component({
							label: 'Image with Credit',
							schema: {
								image: fields.image({
									label: 'Image',
									directory: 'public/uploads/posts',
									publicPath: '/uploads/posts/',
								}),
								alt: fields.text({ label: 'Alt text' }),
								caption: fields.text({ label: 'Caption', multiline: true, validation: { isRequired: false } }),
								credit: fields.text({ label: 'Credit', validation: { isRequired: false } }),
								creditUrl: fields.url({ label: 'Credit URL', validation: { isRequired: false } }),
							},
							preview: () => null,
						}),
						audioEmbed: component({
							label: 'Audio',
							schema: {
								title: fields.text({ label: 'Title', validation: { isRequired: false } }),
								sourceUrl: fields.url({ label: 'Audio URL' }),
								caption: fields.text({ label: 'Caption', multiline: true, validation: { isRequired: false } }),
							},
							preview: () => null,
						}),
						videoEmbed: component({
							label: 'Video',
							schema: {
								title: fields.text({ label: 'Title', validation: { isRequired: false } }),
								sourceUrl: fields.url({ label: 'Video URL' }),
								caption: fields.text({ label: 'Caption', multiline: true, validation: { isRequired: false } }),
							},
							preview: () => null,
						}),
						formula: component({
							label: 'Formula',
							schema: {
								label: fields.text({ label: 'Label', validation: { isRequired: false } }),
								latex: fields.text({ label: 'LaTeX', multiline: true }),
								displayMode: fields.checkbox({ label: 'Display mode', defaultValue: true }),
							},
							preview: () => null,
						}),
						button: component({
							label: 'Button',
							schema: {
								label: fields.text({ label: 'Button label' }),
								href: fields.url({ label: 'Button URL' }),
								variant: fields.select({
									label: 'Style',
									defaultValue: 'primary',
									options: [
										{ label: 'Primary', value: 'primary' },
										{ label: 'Secondary', value: 'secondary' },
										{ label: 'Neutral', value: 'neutral' },
									],
								}),
								external: fields.checkbox({ label: 'Open in new tab', defaultValue: true }),
							},
							preview: () => null,
						}),
						newsletterCta: component({
							label: 'Newsletter Subscribe',
							schema: {
								heading: fields.text({ label: 'Heading', defaultValue: 'Subscribe to the newsletter' }),
								description: fields.text({ label: 'Description', multiline: true }),
								buttonLabel: fields.text({ label: 'Button label', defaultValue: 'Subscribe' }),
								buttonUrl: fields.url({ label: 'Button URL', validation: { isRequired: false } }),
							},
							preview: () => null,
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
			label: 'Site settings',
			path: 'src/content/site',
			format: { data: 'json' },
			schema: {
				tagline: fields.text({ label: 'Tagline' }),
				description: fields.text({ label: 'Description', multiline: true }),
			},
		}),
	},
});
