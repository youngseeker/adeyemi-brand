import { bigint, pgTable, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull(),
  content: text('content').notNull(),
  ipHash: varchar('ip_hash', { length: 128 }),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pageViews = pgTable('page_views', {
  slug: varchar('slug', { length: 255 }).primaryKey(),
  views: bigint('views', { mode: 'number' }).notNull().default(0),
});

export const pageViewEvents = pgTable('page_view_events', {
  id: serial('id').primaryKey(),
  slug: varchar('slug', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const appMeta = pgTable('app_meta', {
  key: varchar('key', { length: 120 }).primaryKey(),
  value: text('value').notNull(),
});

export const newsletterSubscribers = pgTable(
  'newsletter_subscribers',
  {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    emailUnique: uniqueIndex('newsletter_subscribers_email_unique').on(table.email),
  }),
);

export const articleReactions = pgTable(
  'article_reactions',
  {
    id: serial('id').primaryKey(),
    slug: varchar('slug', { length: 255 }).notNull(),
    ipHash: varchar('ip_hash', { length: 128 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    slugIpUnique: uniqueIndex('article_reactions_slug_ip_unique').on(table.slug, table.ipHash),
  }),
);