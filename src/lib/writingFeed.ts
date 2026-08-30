import Parser from 'rss-parser';
import type { WritingPlatform, WritingSource, WritingTheme } from '../data/writing';

export type WritingItem = {
    id: string;
    title: string;
    url: string;
    platform: WritingPlatform;
    publishedAt?: string;
    excerpt?: string;
    themes?: WritingTheme[];
    imageUrl?: string;
};

const parser = new Parser();
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedFeed = {
    items: WritingItem[];
    expiresAt: number;
};

const feedCache = new Map<string, CachedFeed>();

const cleanExcerpt = (value: string | undefined) => {
    if (!value) return undefined;
    const cleaned = value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleaned) return undefined;
    return cleaned.length > 220 ? `${cleaned.slice(0, 217).trimEnd()}…` : cleaned;
};

const normalizeDate = (value: string | undefined) => {
    if (!value) return undefined;
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
};

const resizeSubstackImage = (url: string, width: number) => {
    // Substack serves post images through an image-fetch proxy that accepts
    // Cloudinary-style transform params; requesting a smaller width keeps
    // preview cards light instead of hotlinking full-resolution originals.
    if (!url.includes('substackcdn.com/image/fetch/')) return url;
    return url.replace(/(\/fetch\/\$s_![^!]+!,)/, `$1w_${width},c_limit,`);
};

// rss-parser types `Item` from the base RSS spec only; Substack's feed adds the
// non-standard `content:encoded` field, so it's declared explicitly here instead
// of indexing an untyped key.
type FeedItem = Parser.Item & { 'content:encoded'?: string };

const extractImageUrl = (item: FeedItem): string | undefined => {
    const enclosureUrl = item.enclosure?.type?.startsWith('image') ? item.enclosure.url : undefined;
    const contentImageMatch = (item['content:encoded'] || item.content)?.match(
        /<img[^>]+src="([^"]+)"/,
    );
    const raw = enclosureUrl || contentImageMatch?.[1];
    return raw ? resizeSubstackImage(raw, 900) : undefined;
};

const fetchSource = async (source: WritingSource): Promise<WritingItem[]> => {
    if (!source.feedUrl) return [];
    const cached = feedCache.get(source.feedUrl);
    if (cached && cached.expiresAt > Date.now()) return cached.items;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
        const response = await fetch(source.feedUrl, { signal: controller.signal });
        if (!response.ok) return cached?.items ?? [];
        const feed = await parser.parseString(await response.text());

        const items = (feed.items ?? []).flatMap((item) => {
            const title = item.title?.trim();
            const url = item.link?.trim();
            if (!title || !url) return [];
            return [{
                id: item.guid || url,
                title,
                url,
                platform: source.platform,
                publishedAt: normalizeDate(item.isoDate || item.pubDate),
                excerpt: cleanExcerpt(item.contentSnippet || item.content),
                imageUrl: extractImageUrl(item),
            } satisfies WritingItem];
        });
        feedCache.set(source.feedUrl, { items, expiresAt: Date.now() + CACHE_TTL_MS });
        return items;
    } catch {
        return cached?.items ?? [];
    } finally {
        clearTimeout(timeout);
    }
};

export const fetchWritingItems = async (sources: WritingSource[]): Promise<WritingItem[]> => {
    const results = await Promise.all(sources.map(fetchSource));
    return results
        .flat()
        .sort((a, b) => {
            const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
            const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
            return bTime - aTime;
        });
};
