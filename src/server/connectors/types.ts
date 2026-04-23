export type ProvisionContext = {
  requestId: string;
  organizationId: string;
  actorId: string | null;
  requestTypeSlug: string;
  requestTypeTitle: string;
  payload: Record<string, unknown>;
  requestStatus: string;
  /** Per-type connector override; null falls back to global PROVISION_CONNECTOR env */
  connectorId: string | null;
};

export type ProvisionConnector = {
  readonly name: string;
  provision(ctx: ProvisionContext): Promise<void>;
  revoke(ctx: ProvisionContext): Promise<void>;
};
