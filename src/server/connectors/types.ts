export type ProvisionContext = {
  requestId: string;
  organizationId: string;
  actorId: string | null;
  requestTypeSlug: string;
  requestTypeTitle: string;
  payload: Record<string, unknown>;
  requestStatus: string;
};

export type ProvisionConnector = {
  readonly name: string;
  provision(ctx: ProvisionContext): Promise<void>;
};
