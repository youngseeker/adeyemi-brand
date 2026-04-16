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
				excerpt: fields.text({
					label: 'Excerpt',
					multiline: true,
				}),
				author: fields.text({
					label: 'Author',
					defaultValue: 'Adeyemi Adeniji',
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
						inlineMarks: true,
						listTypes: true,
						headingLevels: true,
						blockTypes: true,
						softBreaks: true,
						alignment: {
							center: true,
							end: true,
						},
					},
					links: true,
					componentBlocks: {
						htmlCanvas: component({
							label: 'HTML Canvas',
							schema: {
								title: fields.text({ label: 'Title' }),
								html: fields.text({ label: 'HTML', multiline: true }),
								height: fields.integer({ label: 'Height (px)', defaultValue: 380 }),
								caption: fields.text({ label: 'Caption', multiline: true }),
							},
							preview: () => null,
						}),
						embedFrame: component({
							label: 'Embed Frame',
							schema: {
								title: fields.text({ label: 'Title' }),
								url: fields.url({ label: 'Embed URL' }),
								height: fields.integer({ label: 'Height (px)', defaultValue: 420 }),
								caption: fields.text({ label: 'Caption', multiline: true }),
							},
							preview: () => null,
						}),
						mermaidDiagram: component({
							label: 'Mermaid Diagram',
							schema: {
								title: fields.text({ label: 'Title' }),
								diagram: fields.text({ label: 'Mermaid syntax', multiline: true }),
								caption: fields.text({ label: 'Caption', multiline: true }),
							},
							preview: () => null,
						}),
						referencesList: component({
							label: 'References List',
							schema: {
								title: fields.text({ label: 'Section title', defaultValue: 'References' }),
								items: fields.array(
									fields.text({ label: 'Reference entry', multiline: true }),
									{
										label: 'Entries',
										itemLabel: (props) => props.value?.slice(0, 50) || 'Reference',
									},
								),
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
