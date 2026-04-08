export const CHANGE_TICKET_STAGES = [
  "draft",
  "on_deck",
  "prelim_uat",
  "final_uat",
  "prod_approval",
  "closed",
] as const;

export type ChangeTicketStage = (typeof CHANGE_TICKET_STAGES)[number];

const ORDER: ChangeTicketStage[] = [...CHANGE_TICKET_STAGES];

export function isChangeTicketStage(s: string): s is ChangeTicketStage {
  return (CHANGE_TICKET_STAGES as readonly string[]).includes(s);
}

export function parseChangeTicketStage(s: string): ChangeTicketStage {
  if (!isChangeTicketStage(s)) throw new Error("Invalid change ticket stage.");
  return s;
}

export function nextChangeTicketStage(
  current: ChangeTicketStage,
): ChangeTicketStage | null {
  const i = ORDER.indexOf(current);
  if (i < 0 || i >= ORDER.length - 1) return null;
  return ORDER[i + 1]!;
}

/** Human-readable step labels for the pipeline UI. */
export const STAGE_LABELS: Record<ChangeTicketStage, string> = {
  draft: "Draft",
  on_deck: "On deck",
  prelim_uat: "Prelim UAT",
  final_uat: "Final UAT",
  prod_approval: "Prod approval",
  closed: "Closed",
};
