ALTER TABLE "conversations" ADD COLUMN "channel" text DEFAULT 'web' NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "external_contact_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "ai_auto_reply_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sender_type" text DEFAULT 'customer' NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "external_message_id" text;