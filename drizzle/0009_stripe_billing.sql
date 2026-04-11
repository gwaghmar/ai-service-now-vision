-- Add Stripe billing columns to organization
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_customer_id" text;
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_subscription_id" text;
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_subscription_status" text;
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "stripe_price_id" text;
