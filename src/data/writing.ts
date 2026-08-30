export type WritingPlatform = 'Substack' | 'Medium';
export type WritingTheme = 'Human' | 'Technology' | 'Systems' | 'Field Notes';

export type WritingSource = {
    platform: WritingPlatform;
    profileUrl?: string;
    feedUrl?: string;
};

export const writingSources: WritingSource[] = [
    {
        platform: 'Substack',
        profileUrl: 'https://adeyemiadeniji.substack.com/',
        feedUrl: 'https://adeyemiadeniji.substack.com/feed',
    },
];

export const configuredWritingSources = writingSources.filter(
    (source): source is WritingSource & { profileUrl: string; feedUrl: string } =>
        Boolean(source.profileUrl && source.feedUrl),
);
