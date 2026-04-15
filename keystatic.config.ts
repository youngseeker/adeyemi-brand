import { collection, component, config, fields, singleton } from '@keystatic/core';

const isProduction = process.env.NODE_ENV === 'production';
const githubRepo = process.env.KEYSTATIC_GITHUB_REPO || '';
const githubClientId = process.env.KEYSTATIC_GITHUB_CLIENT_ID || '';
const githubClientSecret = process.env.KEYSTATIC_GITHUB_CLIENT_SECRET || '';
const keystaticSecret = process.env.KEYSTATIC_SECRET || '';

const getGithubRepoConfig = () => {
	const [owner, ...nameParts] = githubRepo.split('/');
	const name = nameParts.join('/');

	if (!owner || !name) {
		throw new Error('KEYSTATIC_GITHUB_REPO must be in owner/name format when using Keystatic GitHub storage.');
	}

	return { owner, name };
};

const requiredGithubEnvVars = [
	['KEYSTATIC_GITHUB_REPO', githubRepo],
	['KEYSTATIC_GITHUB_CLIENT_ID', githubClientId],
	['KEYSTATIC_GITHUB_CLIENT_SECRET', githubClientSecret],
	['KEYSTATIC_SECRET', keystaticSecret],
] as const;

const missingGithubEnvVars = requiredGithubEnvVars
	.filter(([, value]) => value.trim().length === 0)
	.map(([name]) => name);

if (isProduction && missingGithubEnvVars.length > 0) {
	throw new Error(
		`Keystatic GitHub storage is required in production, but these environment variables are missing: ${missingGithubEnvVars.join(', ')}`,
	);
}

const hasGithubStorage = Boolean(
	githubRepo && githubClientId && githubClientSecret && keystaticSecret && keystaticSecret.length >= 32,
);

if (isProduction && !hasGithubStorage) {
	throw new Error('Keystatic GitHub storage is required in production, but KEYSTATIC_SECRET must be at least 32 characters long.');
}

export default config({
	storage: isProduction
		? {
				kind: 'github',
				repo: getGithubRepoConfig(),
			}
		: {
				kind: 'local',
			},
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
