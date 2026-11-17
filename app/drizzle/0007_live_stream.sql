CREATE TYPE "public"."live_status" AS ENUM('scheduled', 'live', 'ended');--> statement-breakpoint
CREATE TABLE "live_stream" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"youtube_video_id" text NOT NULL,
	"status" "live_status" DEFAULT 'scheduled' NOT NULL,
	"scheduled_start" timestamp with time zone,
	"summary" text,
	"key_points" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"related_article_id" uuid,
	"started_at" timestamp with time zone,
	"ended_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "live_stream" ADD CONSTRAINT "live_stream_related_article_id_article_id_fk" FOREIGN KEY ("related_article_id") REFERENCES "public"."article"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_stream" ADD CONSTRAINT "live_stream_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_stream_status_idx" ON "live_stream" USING btree ("status");