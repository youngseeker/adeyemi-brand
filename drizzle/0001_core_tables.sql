CREATE TABLE IF NOT EXISTS "app_meta" (
	"key" varchar(120) PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "page_views" (
	"slug" varchar(255) PRIMARY KEY NOT NULL,
	"views" bigint DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "page_view_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"ip_hash" varchar(128),
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "newsletter_subscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "newsletter_subscribers_email_unique" ON "newsletter_subscribers" USING btree ("email");
