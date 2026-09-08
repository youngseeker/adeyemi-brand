export type FaqItem = {
    id: string;
    question: string;
    answer: string;
    relatedHref?: string;
    relatedLabel?: string;
};

export const faqItems: FaqItem[] = [
    {
        id: 'who-is-adeyemi',
        question: 'Who is Adeyemi Adeniji?',
        answer:
            'Adeyemi Adeniji is a Computer Science undergraduate at the National Open University of Nigeria who builds software products and writes about people, technology, and work. He is based in Nigeria and learns in public through production work, not only coursework.',
        relatedHref: '/about',
        relatedLabel: 'Read the full About page',
    },
    {
        id: 'what-does-he-do',
        question: 'What does Adeyemi do?',
        answer:
            'He builds and maintains digital products—websites, web applications, and internal tools—usually inside someone else’s venture, with a clearly defined technical role rather than a claim of ownership. He also publishes essays on Substack about people, technology, and work.',
        relatedHref: '/work',
        relatedLabel: 'See selected work',
    },
    {
        id: 'what-projects',
        question: 'What kind of projects has Adeyemi worked on?',
        answer:
            'His selected work includes RILayer (Reflective Intelligence infrastructure, built from scratch in Next.js), the Sam Soyombo Career Pathways website (rebuilt from WordPress into a custom Astro application), SCOPE (a structured reflection workspace in public beta), My Student OS (an academic decision platform for CGPA tracking and degree planning), and a brand website for Athalia Inn Events.',
        relatedHref: '/work',
        relatedLabel: 'View all projects',
    },
    {
        id: 'custom-websites',
        question: 'Does Adeyemi build custom websites and web applications?',
        answer:
            'Yes. Recent examples include rebuilding the Sam Soyombo Career Pathways website as a custom Astro application and building RILayer from scratch in Next.js—both replacing a less maintainable prior setup with purpose-built code.',
        relatedHref: '/work',
        relatedLabel: 'See how each project was built',
    },
    {
        id: 'wordpress',
        question: 'Does Adeyemi work with WordPress?',
        answer:
            'Not as an ongoing platform. His WordPress experience is specifically in replacing it: the Sam Soyombo Career Pathways website moved from an existing WordPress installation to a custom-built, more maintainable Astro site. If a WordPress site needs a more controllable rebuild, that is the kind of work he takes on.',
    },
    {
        id: 'technologies',
        question: 'What technologies does Adeyemi work with?',
        answer:
            'Primarily Next.js, Astro, TypeScript/JavaScript, and Python, with Supabase for authentication and data when a project needs a backend. Each project on the Work page lists its own stack rather than a single fixed toolset.',
        relatedHref: '/work',
        relatedLabel: 'Compare tools by project',
    },
    {
        id: 'improve-existing-site',
        question: 'Can Adeyemi help improve an existing website or system?',
        answer:
            'Yes—this is a recurring part of his work rather than a one-off favour. The Sam Soyombo Career Pathways website is an ongoing improve-and-maintain engagement, and My Student OS was substantially rebuilt into a second version as its requirements grew.',
    },
    {
        id: 'ai-approach',
        question: 'Does Adeyemi work with AI, and what is his approach to it?',
        answer:
            'Yes, with a deliberately restrained approach: his AI-adjacent projects are built to support a person’s own judgement rather than replace it. SCOPE supports reflection “without diagnosing, advising, or deciding for the user,” and RILayer exists to make evidence and boundaries visible “before consequential action” rather than automate it away. Responsible use is a starting constraint, not an afterthought.',
        relatedHref: '/work',
        relatedLabel: 'Read the RILayer and SCOPE project notes',
    },
    {
        id: 'student-os',
        question: 'What is My Student OS?',
        answer:
            'My Student OS is an academic decision platform for tracking CGPA, mapping degree progress, and—via a separate Python engine—running “what-if” scenarios like the effect of retaking a course. Version 2 rebuilt it on Next.js and Supabase, replacing the original single-page tool, with a guided migration path for existing users. The scenario engine isn’t always online.',
        relatedHref: '/work',
        relatedLabel: 'See the My Student OS project record',
    },
    {
        id: 'startups-small-teams',
        question: 'Can Adeyemi work with startups, founders, or small teams?',
        answer:
            'Yes—most of his current work is exactly this kind of relationship: a defined technical role inside someone else’s venture, such as his ongoing work with Sam Soyombo Career Pathways Ltd and RILayer. The Work page is explicit about which parts of each project are his contribution and which are not.',
        relatedHref: '/work',
        relatedLabel: 'See contribution details per project',
    },
    {
        id: 'how-to-contact',
        question: 'How can I contact or work with Adeyemi?',
        answer:
            'Email is the most reliable way to reach him; LinkedIn and GitHub are also open. The Contact page lists every current channel in one place.',
        relatedHref: '/contact',
        relatedLabel: 'Go to the Contact page',
    },
];

export const homepageFaqIds = ['who-is-adeyemi', 'custom-websites', 'ai-approach', 'how-to-contact'];

export const homepageFaqItems = homepageFaqIds
    .map((id) => faqItems.find((item) => item.id === id))
    .filter((item): item is FaqItem => Boolean(item));
