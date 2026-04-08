CREATE TABLE "organization_ai_settings" (
	"organization_id" text PRIMARY KEY NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
	"provider" text DEFAULT 'openai_compatible' NOT NULL,
	"base_url" text,
	"default_model" text DEFAULT 'gpt-4o-mini' NOT NULL,
	"encrypted_api_key" text,
	"key_last_four" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL
);

CREATE TABLE "organization_onboarding" (
	"organization_id" text PRIMARY KEY NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
	"wizard_version" integer DEFAULT 1 NOT NULL,
	"wizard_completed_at" timestamp with time zone,
	"steps" jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE "organization_invite" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
	"email" text NOT NULL,
	"role" text DEFAULT 'requester' NOT NULL,
	"token_hash" text NOT NULL UNIQUE,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by_user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"accepted_at" timestamp with time zone
);

CREATE INDEX "organization_invite_org_idx" ON "organization_invite" ("organization_id");
CREATE INDEX "organization_invite_email_idx" ON "organization_invite" ("organization_id", "email");

CREATE TABLE "organization_email_settings" (
	"organization_id" text PRIMARY KEY NOT NULL REFERENCES "organization"("id") ON DELETE CASCADE,
	"provider" text DEFAULT 'resend_env' NOT NULL,
	"from_address" text,
	"encrypted_credentials" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
