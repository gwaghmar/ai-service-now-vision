import type { ProvisionConnector } from "./types";

/**
 * Selects provision implementation. Priority:
 * 1. Explicit connectorId from request type (per-type routing)
 * 2. PROVISION_CONNECTOR env (global fallback)
 * 3. "stub" (dev default)
 */
export function getConnector(connectorId?: string | null): ProvisionConnector {
  const name = connectorId?.trim() || process.env.PROVISION_CONNECTOR?.trim() || "stub";

  if (name === "http_webhook") {
    return {
      name: "http_webhook",
      async provision(ctx) {
        const { runHttpWebhookProvision } = await import("./http-webhook");
        await runHttpWebhookProvision(ctx);
      },
      async revoke(ctx) {
        const { runHttpWebhookRevoke } = await import("./http-webhook");
        await runHttpWebhookRevoke(ctx);
      },
    };
  }

  if (name === "manual_ticketing") {
    return {
      name: "manual_ticketing",
      async provision(ctx) {
        const { runManualProvisionFallback } = await import("./manual-ticketing");
        await runManualProvisionFallback(ctx);
      },
      async revoke(ctx) {
        const { runManualRevokeFallback } = await import("./manual-ticketing");
        await runManualRevokeFallback(ctx);
      },
    };
  }

  if (name === "github") {
    return {
      name: "github",
      async provision(ctx) {
        const { runGitHubProvision } = await import("./github");
        await runGitHubProvision(ctx);
      },
      async revoke(ctx) {
        const { runGitHubRevoke } = await import("./github");
        await runGitHubRevoke(ctx);
      },
    };
  }

  if (name === "google_workspace") {
    return {
      name: "google_workspace",
      async provision(ctx) {
        const { runGoogleWorkspaceProvision } = await import("./google-workspace");
        await runGoogleWorkspaceProvision(ctx);
      },
      async revoke(ctx) {
        const { runGoogleWorkspaceRevoke } = await import("./google-workspace");
        await runGoogleWorkspaceRevoke(ctx);
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
      async revoke(ctx) {
        console.info("[connector:log] revoke", ctx);
        const { runRevokeStub } = await import("@/server/fulfillment");
        await runRevokeStub(ctx);
      },
    };
  }

  return {
    name: "stub",
    async provision(ctx) {
      const { runProvisionStub } = await import("@/server/fulfillment");
      await runProvisionStub(ctx);
    },
    async revoke(ctx) {
      const { runRevokeStub } = await import("@/server/fulfillment");
      await runRevokeStub(ctx);
    },
  };
}
