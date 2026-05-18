export async function fetchSubstackFeedItems(feedUrl: string) {
    try {
        const Parser = (await import('rss-parser')).default;
        const parser = new Parser();
        const feed = await parser.parseURL(feedUrl);
        const items = (feed.items || []).map((it) => ({
            link: (it.link || '').toString(),
            title: (it.title || '').toString(),
        }));
        return items;
    } catch (err) {
        // Don't fail the build — return empty list on errors
        // eslint-disable-next-line no-console
        console.error('fetchSubstackFeedItems error:', err);
        return [];
    }
}
