import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import type { LanguageModelV3 } from "@ai-sdk/provider";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizationAiSettings } from "@/db/schema";
import { decryptFieldIfNeeded } from "@/lib/field-encryption";

export class AiNotConfiguredError extends Error {
  constructor(message = "AI is not configured for this organization.") {
    super(message);
    this.name = "AiNotConfiguredError";
  }
}

function platformFallbackAllowed(): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_AI_PLATFORM_FALLBACK === "true";
}

/** When true, callers should skip network and return fixtures (tests). */
export function isTestAiMock(): boolean {
  const v = process.env.TEST_AI_MOCK?.trim();
  return v === "1" || v === "true";
}

export type OrgAiCredentials = {
  apiKey: string;
  baseURL: string | undefined;
  model: string;
  usedPlatformFallback: boolean;
};

export async function getOrgAiCredentials(
  orgId: string,
): Promise<OrgAiCredentials> {
  const [row] = await db
    .select()
    .from(organizationAiSettings)
    .where(eq(organizationAiSettings.organizationId, orgId))
    .limit(1);

  if (row?.encryptedApiKey) {
    try {
      const apiKey = decryptFieldIfNeeded(row.encryptedApiKey);
      if (apiKey.trim()) {
        return {
          apiKey,
          baseURL: row.baseUrl?.trim() || undefined,
          model: row.defaultModel?.trim() || "gpt-4o-mini",
          usedPlatformFallback: false,
        };
      }
    } catch {
      /* fall through to platform / error */
    }
  }

  const platformKey = process.env.APP_AI_PLATFORM_API_KEY?.trim();
  const platformBase = process.env.APP_AI_PLATFORM_BASE_URL?.trim();
  const platformModel =
    process.env.APP_AI_PLATFORM_MODEL?.trim() || "gpt-4o-mini";
  if (platformKey && platformFallbackAllowed()) {
    return {
      apiKey: platformKey,
      baseURL: platformBase || undefined,
      model: platformModel,
      usedPlatformFallback: true,
    };
  }

  throw new AiNotConfiguredError();
}

export type OrgLanguageModelResult = {
  model: LanguageModelV3;
  modelId: string;
  usedPlatformFallback: boolean;
};

export async function getOrgLanguageModel(
  orgId: string,
): Promise<OrgLanguageModelResult> {
  const { apiKey, baseURL, model, usedPlatformFallback } =
    await getOrgAiCredentials(orgId);
  const provider = createOpenAI({
    apiKey,
    baseURL,
  });
  return {
    model: provider.chat(model),
    modelId: model,
    usedPlatformFallback,
  };
}

export async function testOrgAiConnection(orgId: string): Promise<{
  ok: boolean;
  message: string;
  usedPlatformFallback?: boolean;
}> {
  if (isTestAiMock()) {
    return { ok: true, message: "TEST_AI_MOCK: skipped live call.", usedPlatformFallback: false };
  }
  try {
    const { model, usedPlatformFallback } = await getOrgLanguageModel(orgId);
    const { text } = await generateText({
      model,
      prompt: "Reply with exactly the word OK and nothing else.",
      maxOutputTokens: 16,
    });
    const ok = text.trim().toUpperCase().includes("OK");
    return {
      ok,
      message: ok
        ? "Connection OK."
        : `Unexpected model response: ${text.slice(0, 80)}`,
      usedPlatformFallback,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, message: msg };
  }
}
