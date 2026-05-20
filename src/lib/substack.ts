export async function fetchSubstackFeedItems(feedUrl: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
        const Parser = (await import('rss-parser')).default;
        const parser = new Parser();
        const response = await fetch(feedUrl, { signal: controller.signal });
        if (!response.ok) return [];
        const xml = await response.text();
        const feed = await parser.parseString(xml);
        const items = (feed.items || []).map((it) => ({
            link: (it.link || '').toString(),
            title: (it.title || '').toString(),
            pubDate: (it.pubDate || it.isoDate || '').toString(),
        }));
        return items;
    } catch (err) {
        // Don't fail the build — return empty list on errors
        // eslint-disable-next-line no-console
        console.error('fetchSubstackFeedItems error:', err);
        return [];
    } finally {
        clearTimeout(timeout);
    }
}
