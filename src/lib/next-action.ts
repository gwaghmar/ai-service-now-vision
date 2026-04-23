/**
 * Returns a human-readable description of what should happen next for a request,
 * personalized to the viewer's role.
 */
export function nextActionGuidance(input: {
  status: string;
  isRequester: boolean;
  isApprover: boolean;
  approverEmail: string | null;
}): { label: string; detail: string; tone: "info" | "action" | "done" | "warn" } | null {
  const { status, isRequester, isApprover, approverEmail } = input;

  switch (status) {
    case "pending_approval":
      if (isApprover) {
        return {
          label: "Your review is needed",
          detail: "Review the payload and triage assessment below, then approve, deny, or request more info.",
          tone: "action",
        };
      }
      return {
        label: "Waiting for review",
        detail: approverEmail
          ? `Assigned to ${approverEmail}. You'll be notified when a decision is made.`
          : "An approver will review this shortly.",
        tone: "info",
      };

    case "needs_info":
      if (isRequester) {
        return {
          label: "More info requested",
          detail: "The approver asked for additional details. Update your request below.",
          tone: "action",
        };
      }
      if (isApprover) {
        return {
          label: "Waiting for requester",
          detail: "You asked for more info — the requester has been notified.",
          tone: "info",
        };
      }
      return null;

    case "approved":
      return {
        label: "Approved — provisioning queued",
        detail: "The request was approved. Automated provisioning will run shortly.",
        tone: "info",
      };

    case "fulfilled":
      return {
        label: "Complete",
        detail: "Access has been provisioned. No further action needed.",
        tone: "done",
      };

    case "denied":
      return {
        label: "Denied",
        detail: "This request was denied. See the decision comment below for details.",
        tone: "warn",
      };

    case "failed":
      return {
        label: "Provisioning failed",
        detail: "Automated provisioning could not complete. An admin should investigate the audit trail.",
        tone: "warn",
      };

    case "manual_action_required":
      return {
        label: "Manual action needed",
        detail: "This request requires manual IT fulfillment. Track progress via the audit trail.",
        tone: "action",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        detail: "This request was cancelled and requires no further action.",
        tone: "done",
      };

    default:
      return null;
  }
}
