CREATE TABLE "newsletter_delivery" (
	"issue_id" uuid NOT NULL,
	"subscriber_id" uuid NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "newsletter_delivery_issue_id_subscriber_id_pk" PRIMARY KEY("issue_id","subscriber_id")
);
--> statement-breakpoint
ALTER TABLE "breaking_alert" ADD COLUMN "alert_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "newsletter_issue" ADD COLUMN "send_locked_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "newsletter_subscriber" ADD COLUMN "last_confirm_sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "push_subscription" ADD COLUMN "failures" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "newsletter_delivery" ADD CONSTRAINT "newsletter_delivery_issue_id_newsletter_issue_id_fk" FOREIGN KEY ("issue_id") REFERENCES "public"."newsletter_issue"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_delivery" ADD CONSTRAINT "newsletter_delivery_subscriber_id_newsletter_subscriber_id_fk" FOREIGN KEY ("subscriber_id") REFERENCES "public"."newsletter_subscriber"("id") ON DELETE cascade ON UPDATE no action;