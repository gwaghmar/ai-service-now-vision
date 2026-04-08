import type { ProvisionConnector } from "./types";

/**
 * Selects provision implementation via PROVISION_CONNECTOR:
 * - stub (default): local simulation
 * - log: logs then stub
 * - http_webhook: POST to PROVISION_WEBHOOK_URL
 */
export function getConnector(): ProvisionConnector {
  const name = process.env.PROVISION_CONNECTOR?.trim() || "stub";

  if (name === "http_webhook") {
    return {
      name: "http_webhook",
      async provision(ctx) {
        const { runHttpWebhookProvision } = await import("./http-webhook");
        await runHttpWebhookProvision(ctx);
      },
    };
  }

  if (name === "log") {
    return {
      name: "log",
      async provision(ctx) {
        console.info("[connector:log] provision", ctx);
        const { runProvisionStub } = await import("@/server/fulfillment");
        await runProvisionStub(ctx);
      },
    };
  }

  return {
    name: "stub",
    async provision(ctx) {
      const { runProvisionStub } = await import("@/server/fulfillment");
      await runProvisionStub(ctx);
    },
  };
}
