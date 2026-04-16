ALTER TABLE "organization" ADD COLUMN "slack_team_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX "organization_slack_team_id_unique" ON "organization" USING btree ("slack_team_id") WHERE "organization"."slack_team_id" is not null;
