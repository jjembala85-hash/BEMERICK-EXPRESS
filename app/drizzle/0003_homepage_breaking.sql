CREATE TABLE "breaking_alert" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"text" text NOT NULL,
	"article_id" uuid,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"cleared_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "homepage_slot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone" text NOT NULL,
	"position" integer NOT NULL,
	"article_id" uuid NOT NULL,
	"override_headline" text,
	"pinned_until" timestamp with time zone,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "breaking_alert" ADD CONSTRAINT "breaking_alert_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "breaking_alert" ADD CONSTRAINT "breaking_alert_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_slot" ADD CONSTRAINT "homepage_slot_article_id_article_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."article"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "homepage_slot" ADD CONSTRAINT "homepage_slot_updated_by_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "breaking_alert_expires_idx" ON "breaking_alert" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "homepage_slot_zone_position_idx" ON "homepage_slot" USING btree ("zone","position");