export function requestStatusLabel(status: string): string {
  switch (status) {
    case "pending_approval":
      return "Waiting for approval";
    case "needs_info":
      return "Needs more info";
    case "fulfilled":
      return "Done";
    case "failed":
      return "Could not complete";
    default:
      return status.replace(/_/g, " ");
  }
}
