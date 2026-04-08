CREATE TABLE "approval_email_nonce" (
	"jti" text PRIMARY KEY NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "approval_routing_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"request_type_id" text,
	"approver_user_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "manager_user_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "department" text;--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "routing_approver_ids" jsonb;--> statement-breakpoint
ALTER TABLE "approval_routing_rule" ADD CONSTRAINT "approval_routing_rule_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_routing_rule" ADD CONSTRAINT "approval_routing_rule_request_type_id_request_type_id_fk" FOREIGN KEY ("request_type_id") REFERENCES "public"."request_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "approval_routing_rule" ADD CONSTRAINT "approval_routing_rule_approver_user_id_user_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "approval_email_nonce_created_idx" ON "approval_email_nonce" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "approval_routing_rule_org_idx" ON "approval_routing_rule" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "approval_routing_rule_type_idx" ON "approval_routing_rule" USING btree ("request_type_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_manager_user_id_user_id_fk" FOREIGN KEY ("manager_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_manager_user_id_idx" ON "user" USING btree ("manager_user_id");
