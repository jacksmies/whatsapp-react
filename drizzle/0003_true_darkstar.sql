CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"phone_number" text NOT NULL,
	"name" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_phone_number_idx" ON "contacts" USING btree ("phone_number");
--> statement-breakpoint
INSERT INTO "contacts" ("id", "phone_number")
SELECT (
	substr(md5("external_contact_id"), 1, 8) || '-' ||
	substr(md5("external_contact_id"), 9, 4) || '-' ||
	substr(md5("external_contact_id"), 13, 4) || '-' ||
	substr(md5("external_contact_id"), 17, 4) || '-' ||
	substr(md5("external_contact_id"), 21, 12)
)::uuid, "external_contact_id"
FROM "conversations"
WHERE "channel" = 'whatsapp' AND "external_contact_id" IS NOT NULL
ON CONFLICT ("phone_number") DO NOTHING;
