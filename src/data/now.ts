export type NowCategory = {
    label: 'Studying' | 'Building' | 'Writing' | 'Learning' | 'Exploring';
    items: string[];
};

export type NowData = {
    updatedAt: string;
    categories: NowCategory[];
};

export const now: NowData = {
    updatedAt: 'August 2026',
    categories: [
        {
            label: 'Studying',
            items: ['BSc Computer Science at the National Open University of Nigeria'],
        },
        {
            label: 'Building',
            items: ['SCOPE', 'This personal website rebuild'],
        },
        {
            label: 'Learning',
            items: ['Algorithms, databases, and software engineering foundations'],
        },
    ],
};

export const activeNowCategories = now.categories.filter((category) => category.items.length > 0);
