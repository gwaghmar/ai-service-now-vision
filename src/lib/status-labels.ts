export function requestStatusLabel(status: string): string {
  switch (status) {
    case "pending_approval":
      return "Waiting for approval";
    case "needs_info":
      return "Needs more info";
    case "approved":
      return "Approved";
    case "denied":
      return "Denied";
    case "cancelled":
      return "Cancelled";
    case "fulfilled":
      return "Done";
    case "failed":
      return "Could not complete";
    case "manual_action_required":
      return "Manual action needed";
    case "provisioning":
      return "Provisioning";
    default:
      return status.replace(/_/g, " ");
  }
}
