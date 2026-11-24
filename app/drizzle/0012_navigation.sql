CREATE TABLE "section_pin" (
	"section_id" uuid PRIMARY KEY NOT NULL,
	"article_id" uuid NOT NULL,
	"pinned_until" timestamp with time zone,
	"pinned_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_view" (
	"article_id" uuid NOT NULL,
	"day" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "story_view_article_id_day_pk" PRIMARY KEY("article_id","day")
);
--> statement-breakpoint
ALTER TABLE "section_pin" ADD CONSTRAINT "section_pin_section_id_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_pin" ADD CONSTRAINT "section_pin_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section_pin" ADD CONSTRAINT "section_pin_pinned_by_user_id_fk" FOREIGN KEY ("pinned_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_view" ADD CONSTRAINT "story_view_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "story_view_day_idx" ON "story_view" USING btree ("day");