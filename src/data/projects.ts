export type ProjectStatus = 'live' | 'in-progress' | 'maintained' | 'completed';

export type Project = {
    slug: string;
    name: string;
    summary: string;
    context: string;
    contribution: string[];
    technology: string[];
    status: ProjectStatus;
    statusLabel: string;
    period?: string;
    outcome?: string;
    links: {
        live?: string;
        code?: string;
    };
    image?: {
        src: string;
        alt: string;
    };
    featured: boolean;
    order: number;
    relatedExperienceId?: string;
};

export const projects: Project[] = [
    {
        slug: 'rilayer',
        name: 'RILayer',
        summary: 'Reflective Intelligence infrastructure that makes evidence, boundaries, and human accountability visible before consequential action.',
        context: 'RILayer is currently progressing through controlled proof-of-concept and prototype validation.',
        contribution: ['Built the product from scratch using Next.js'],
        technology: ['Next.js'],
        status: 'in-progress',
        statusLabel: 'Prototype validation',
        period: 'April 2026 — present',
        links: { live: 'https://rilayer.com/' },
        image: { src: '/work/rilayer.webp', alt: 'Screenshot of the RILayer homepage' },
        featured: true,
        order: 1,
        relatedExperienceId: 'rilayer',
    },
    {
        slug: 'samsoyombo-website',
        name: 'SCP website',
        summary: 'The public home of the Sam Soyombo Career Pathways ecosystem, its pathways, tools, and resources.',
        context: 'The existing WordPress site needed to be replaced with a purpose-built, maintainable website.',
        contribution: ['Rebuilt the website from scratch as a custom Astro application'],
        technology: ['Astro'],
        status: 'maintained',
        statusLabel: 'Live · maintained',
        period: 'August 2025 — present',
        links: { live: 'https://samsoyombo.com/' },
        image: { src: '/work/samsoyombo-website.webp', alt: 'Screenshot of the Sam Soyombo Career Pathways website homepage' },
        featured: true,
        order: 2,
        relatedExperienceId: 'samsoyombo',
    },
    {
        slug: 'scope',
        name: 'SCOPE',
        summary: 'A structured reflection workspace for organising facts, feelings, assumptions, options, risks, and evidence before action.',
        context: 'SCOPE is a controlled public beta that supports reflection without diagnosing, advising, or deciding for the user.',
        contribution: ['Built SCOPE as a custom application and reflective workspace'],
        technology: ['Custom application'],
        status: 'live',
        statusLabel: 'Public beta',
        period: 'Present',
        links: { live: 'https://samsoyombo.com/scope/' },
        image: { src: '/work/scope.webp', alt: 'Screenshot of the SCOPE reflective workspace interface' },
        featured: true,
        order: 3,
        relatedExperienceId: 'samsoyombo',
    },
    {
        slug: 'student-os',
        name: 'Universal CGPA Calculator / My Student OS',
        summary: 'A persistent GPA and CGPA dashboard for students tracking academic progress across semesters.',
        context: 'Students needed a way to retain and update cumulative results beyond a single calculation session.',
        contribution: ['Product design', 'Front-end development', 'Progressive web app implementation'],
        technology: ['JavaScript', 'PWA'],
        status: 'completed',
        statusLabel: 'Completed',
        period: 'December 2025',
        outcome: 'Published a persistent academic-progress tool designed for NOUN students.',
        links: { live: 'https://my-student-os.vercel.app/index.html' },
        image: { src: '/work/student-os.webp', alt: 'Screenshot of the My Student OS CGPA dashboard' },
        featured: false,
        order: 4,
    },
    {
        slug: 'athalia-inn-events',
        name: 'Athalia Inn Events',
        summary: 'A responsive brand website for an event-planning and floral-design business.',
        context: 'The business needed a focused public presence that communicated its services visually and clearly.',
        contribution: ['Front-end development', 'Responsive interface implementation'],
        technology: ['Front-end development'],
        status: 'completed',
        statusLabel: 'Delivered',
        period: 'January 2026',
        outcome: 'Published a public marketing website for the business.',
        links: { live: 'https://athalia-website.vercel.app/' },
        image: { src: '/work/athalia-inn-events.webp', alt: 'Screenshot of the Athalia Inn Events homepage' },
        featured: false,
        order: 5,
    },
];

export const featuredProjects = projects.filter((project) => project.featured).sort((a, b) => a.order - b.order);
export const supportingProjects = projects.filter((project) => !project.featured).sort((a, b) => a.order - b.order);
