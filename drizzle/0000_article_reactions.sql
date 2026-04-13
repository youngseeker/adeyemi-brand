CREATE TABLE IF NOT EXISTS "article_reactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"ip_hash" varchar(128) NOT NULL,
	"created_at" timestamp DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "article_reactions_slug_ip_unique" ON "article_reactions" USING btree ("slug","ip_hash");