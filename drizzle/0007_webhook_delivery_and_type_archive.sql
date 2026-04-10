-- Idempotent: safe if objects were already applied via `db:push` or a partial apply.
-- Order: table → FK (guarded) → indexes IF NOT EXISTS → request_type column → replace slug unique index.

CREATE TABLE IF NOT EXISTS "webhook_delivery" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"event" text NOT NULL,
	"payload" text NOT NULL,
	"target_url" text NOT NULL,
	"signing_secret" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"next_retry_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $webhook_delivery_fk$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint c
		INNER JOIN pg_class rel ON rel.oid = c.conrelid
		INNER JOIN pg_namespace n ON n.oid = rel.relnamespace
		WHERE c.conname = 'webhook_delivery_organization_id_organization_id_fk'
			AND n.nspname = 'public'
			AND rel.relname = 'webhook_delivery'
	) THEN
		ALTER TABLE "webhook_delivery"
			ADD CONSTRAINT "webhook_delivery_organization_id_organization_id_fk"
			FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id")
			ON DELETE CASCADE;
	END IF;
END
$webhook_delivery_fk$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_delivery_org_status_idx" ON "webhook_delivery" USING btree ("organization_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_delivery_next_retry_idx" ON "webhook_delivery" USING btree ("next_retry_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "webhook_delivery_status_retry_idx" ON "webhook_delivery" USING btree ("status","next_retry_at");
--> statement-breakpoint
ALTER TABLE "request_type" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
--> statement-breakpoint
DROP INDEX IF EXISTS "request_type_org_slug_unique";
--> statement-breakpoint
-- Fails only if two non-archived rows share the same (organization_id, slug); fix data then re-run.
CREATE UNIQUE INDEX IF NOT EXISTS "request_type_org_slug_unique" ON "request_type" USING btree ("organization_id","slug") WHERE "archived_at" is null;
