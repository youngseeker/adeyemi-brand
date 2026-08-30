export type Experience = {
    id: string;
    organization: string;
    role: string;
    officialTitle?: string;
    plainLanguageSummary: string;
    period: string;
    location?: string;
    relatedProjectSlugs?: string[];
};

export const experience: Experience[] = [
    {
        id: 'rilayer',
        organization: 'RILayer',
        role: 'Product development and model translation',
        officialTitle: 'Reflective Model Translation Partner',
        plainLanguageSummary:
            'Translating human coaching and reflective models into clear structures for responsible digital products.',
        period: 'April 2026 — present',
        location: 'Remote',
        relatedProjectSlugs: ['rilayer'],
    },
    {
        id: 'samsoyombo',
        organization: 'SamSoyombo Career Pathways Ltd',
        role: 'Website development and management',
        officialTitle: 'Website Management',
        plainLanguageSummary:
            'Improving and maintaining the company website, its content structure, hosting, and delivery.',
        period: 'August 2025 — present',
        location: 'Remote',
        relatedProjectSlugs: ['samsoyombo-website', 'scope'],
    },
    {
        id: 'samsoyombo-collaboration',
        organization: 'SamSoyombo Career Pathways Ltd',
        role: 'Technical and project collaboration',
        officialTitle: 'Technical & Soft Skill Collaborator',
        plainLanguageSummary: 'Supporting online initiatives, documentation, workflows, and practical project delivery.',
        period: '2023 — present',
        location: 'Remote',
    },
];
