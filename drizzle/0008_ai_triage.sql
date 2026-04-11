-- Add AI triage columns to request
--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "ai_triage_risk" text;
--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "ai_triage_reason" text;
--> statement-breakpoint
ALTER TABLE "request" ADD COLUMN "ai_triage_at" timestamp with time zone;
--> statement-breakpoint
-- Allow system (AI) auto-approvals with no human approver
ALTER TABLE "approval" ALTER COLUMN "approver_id" DROP NOT NULL;
