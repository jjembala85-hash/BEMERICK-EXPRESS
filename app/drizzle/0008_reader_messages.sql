CREATE TYPE "public"."message_kind" AS ENUM('contact', 'tip', 'advertise');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('new', 'read', 'archived');--> statement-breakpoint
CREATE TABLE "form_throttle" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reader_message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "message_kind" NOT NULL,
	"status" "message_status" DEFAULT 'new' NOT NULL,
	"name" text,
	"reply_to" text,
	"subject" text,
	"body" text NOT NULL,
	"handled_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reader_message" ADD CONSTRAINT "reader_message_handled_by_user_id_fk" FOREIGN KEY ("handled_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "form_throttle_key_idx" ON "form_throttle" USING btree ("key_hash","created_at");--> statement-breakpoint
CREATE INDEX "reader_message_kind_status_idx" ON "reader_message" USING btree ("kind","status","created_at");