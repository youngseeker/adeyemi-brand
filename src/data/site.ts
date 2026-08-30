export const site = {
    name: 'Adeyemi Adeniji',
    wordmark: 'ADEYEMI ADENIJI',
    description:
        'Computer Science undergraduate building software and writing about people, technology, work, and what he is learning.',
    url: 'https://adeyemiadeniji.dev',
    locale: 'en_GB',
} as const;

export const navigation = [
    { label: 'Work', href: '/work' },
    { label: 'Writing', href: '/writing' },
    { label: 'About', href: '/about' },
    { label: 'Now', href: '/now' },
] as const;

export type ExternalLink = {
    label: string;
    href: string;
    kind: 'email' | 'social' | 'publication';
};

export const externalLinks: ExternalLink[] = [
    { label: 'Email', href: 'mailto:danieladeniji001@gmail.com', kind: 'email' },
    {
        label: 'LinkedIn',
        href: 'https://www.linkedin.com/in/adeyemi-adeniji/',
        kind: 'social',
    },
    {
        label: 'GitHub',
        href: 'https://github.com/youngseeker',
        kind: 'social',
    },
    {
        label: 'Substack',
        href: 'https://adeyemiadeniji.substack.com/',
        kind: 'publication',
    },
];

export const contactLink = externalLinks.find((link) => link.kind === 'email')!;
