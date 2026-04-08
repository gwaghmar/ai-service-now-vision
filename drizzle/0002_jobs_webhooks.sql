ALTER TABLE "organization" ADD COLUMN "webhook_url" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "webhook_signing_secret" text;--> statement-breakpoint
CREATE TABLE "fulfillment_job" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"request_id" text NOT NULL,
	"actor_id" text,
	"status" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fulfillment_job" ADD CONSTRAINT "fulfillment_job_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_job" ADD CONSTRAINT "fulfillment_job_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_job" ADD CONSTRAINT "fulfillment_job_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fulfillment_job_org_status_idx" ON "fulfillment_job" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "fulfillment_job_request_idx" ON "fulfillment_job" USING btree ("request_id");
