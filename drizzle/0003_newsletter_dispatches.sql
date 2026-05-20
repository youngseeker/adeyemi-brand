CREATE TABLE IF NOT EXISTS "newsletter_article_dispatches" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"recipients" integer DEFAULT 0 NOT NULL,
	"sent_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_article_dispatches_slug_unique" ON "newsletter_article_dispatches" USING btree ("slug");
