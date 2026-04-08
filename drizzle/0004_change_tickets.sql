CREATE TABLE "change_template" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"field_schema" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "change_ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"change_template_id" text NOT NULL,
	"requester_id" text NOT NULL,
	"assigned_user_id" text,
	"title" text NOT NULL,
	"payload" jsonb NOT NULL,
	"stage" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "change_template" ADD CONSTRAINT "change_template_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_ticket" ADD CONSTRAINT "change_ticket_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_ticket" ADD CONSTRAINT "change_ticket_change_template_id_change_template_id_fk" FOREIGN KEY ("change_template_id") REFERENCES "public"."change_template"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_ticket" ADD CONSTRAINT "change_ticket_requester_id_user_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "change_ticket" ADD CONSTRAINT "change_ticket_assigned_user_id_user_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "change_template_org_slug_unique" ON "change_template" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "change_ticket_org_stage_idx" ON "change_ticket" USING btree ("organization_id","stage");--> statement-breakpoint
CREATE INDEX "change_ticket_requester_idx" ON "change_ticket" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX "change_ticket_assigned_idx" ON "change_ticket" USING btree ("assigned_user_id");--> statement-breakpoint
CREATE INDEX "change_ticket_org_created_idx" ON "change_ticket" USING btree ("organization_id","created_at");
