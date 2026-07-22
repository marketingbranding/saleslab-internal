CREATE TABLE "data_sync_receipts" (
	"operation_id" varchar(128) PRIMARY KEY NOT NULL,
	"command_fingerprint" varchar(64) NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" varchar(128) NOT NULL,
	"source_revision" integer NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"applied_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "data_sync_receipts_entity_type_check" CHECK ("data_sync_receipts"."entity_type" in ('branch', 'settings')),
	CONSTRAINT "data_sync_receipts_revision_check" CHECK ("data_sync_receipts"."source_revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "source_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "app_settings" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "source_revision" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "branches" ADD COLUMN "source_hash" varchar(64);--> statement-breakpoint
CREATE INDEX "data_sync_receipts_entity_idx" ON "data_sync_receipts" USING btree ("entity_type","entity_id");