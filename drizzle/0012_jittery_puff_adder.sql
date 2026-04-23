CREATE TABLE "policy_decision_log" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"request_id" text,
	"request_type_slug" text NOT NULL,
	"decision" text NOT NULL,
	"reason" text,
	"policy_version" text,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "is_emergency_override" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "override_reason" text;--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "policy_decision_log" ADD CONSTRAINT "policy_decision_log_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decision_log" ADD CONSTRAINT "policy_decision_log_request_id_request_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."request"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_decision_log" ADD CONSTRAINT "policy_decision_log_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;