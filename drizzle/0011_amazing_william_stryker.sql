CREATE TABLE "app_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"app_name" text NOT NULL,
	"vendor" text NOT NULL,
	"category" text NOT NULL,
	"connector_type" text DEFAULT 'manual_ticketing' NOT NULL,
	"sso_support" text DEFAULT 'false' NOT NULL,
	"telemetry_support" text DEFAULT 'none' NOT NULL,
	"known_limits" text,
	"setup_guide_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "okta_group_mapping" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"group_name" text NOT NULL,
	"request_type_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_type" ADD COLUMN "app_catalog_id" text;--> statement-breakpoint
ALTER TABLE "app_catalog" ADD CONSTRAINT "app_catalog_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okta_group_mapping" ADD CONSTRAINT "okta_group_mapping_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "okta_group_mapping" ADD CONSTRAINT "okta_group_mapping_request_type_id_request_type_id_fk" FOREIGN KEY ("request_type_id") REFERENCES "public"."request_type"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "okta_group_mapping_org_group_type_unique" ON "okta_group_mapping" USING btree ("organization_id","group_name","request_type_id");