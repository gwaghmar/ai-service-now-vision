/**
 * Governance Platform — TypeScript API SDK
 *
 * Usage:
 *   const client = new GovernanceClient({ baseUrl: "https://your-app.com", apiKey: "gk_..." });
 *   const req = await client.requests.create({ requestTypeSlug: "access-request", requesterEmail: "...", payload: { ... } });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RequestStatus =
  | "pending_approval"
  | "approved"
  | "denied"
  | "needs_info"
  | "fulfillment_pending"
  | "fulfilled";

export type CreatedRequest = {
  id: string;
  status: RequestStatus;
  requestTypeSlug: string;
};

export type RequestDetail = {
  id: string;
  status: RequestStatus;
  requestTypeSlug: string;
  requesterId: string;
  payload: Record<string, unknown>;
  aiTriageRisk?: string | null;
  aiTriageReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ListRequestsParams = {
  status?: RequestStatus;
  requestTypeSlug?: string;
  page?: number;
  pageSize?: number;
};

export type ListRequestsResponse = {
  data: RequestDetail[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateRequestParams = {
  requestTypeSlug: string;
  requesterEmail: string;
  payload: Record<string, unknown>;
};

export type ApprovalDecision = "approved" | "denied" | "needs_info";

export type DecideRequestParams = {
  requestId: string;
  decision: ApprovalDecision;
  comment?: string;
};

export type RequestType = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

export type SdkOptions = {
  baseUrl: string;
  apiKey: string;
  /** Optional fetch override (e.g. for testing). Defaults to global fetch. */
  fetch?: typeof fetch;
};

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class GovernanceClient {
  readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly _fetch: typeof fetch;

  readonly requests: RequestsResource;
  readonly requestTypes: RequestTypesResource;

  constructor(opts: SdkOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.apiKey = opts.apiKey;
    this._fetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.requests = new RequestsResource(this);
    this.requestTypes = new RequestTypesResource(this);
  }

  /** @internal */
  async _request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await this._fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const data = (await res.json()) as { error?: string; code?: string };
        msg = data.error ?? data.code ?? msg;
      } catch {
        /* ignore */
      }
      throw new GovernanceApiError(msg, res.status);
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }
}

export class GovernanceApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "GovernanceApiError";
  }
}

// ---------------------------------------------------------------------------
// Resources
// ---------------------------------------------------------------------------

class RequestsResource {
  constructor(private readonly client: GovernanceClient) {}

  /** Create a new service request. */
  create(params: CreateRequestParams): Promise<CreatedRequest> {
    return this.client._request<CreatedRequest>("POST", "/api/v1/requests", params);
  }

  /** List requests (paginated). Requires approver or admin key. */
  list(params: ListRequestsParams = {}): Promise<ListRequestsResponse> {
    const qs = new URLSearchParams();
    if (params.status) qs.set("status", params.status);
    if (params.requestTypeSlug) qs.set("requestTypeSlug", params.requestTypeSlug);
    if (params.page) qs.set("page", String(params.page));
    if (params.pageSize) qs.set("pageSize", String(params.pageSize));
    const query = qs.toString();
    return this.client._request<ListRequestsResponse>(
      "GET",
      `/api/v1/requests${query ? `?${query}` : ""}`,
    );
  }

  /** Get a single request by ID. */
  get(requestId: string): Promise<RequestDetail> {
    return this.client._request<RequestDetail>("GET", `/api/v1/requests/${requestId}`);
  }

  /** Apply an approval decision to a request. Requires approver or admin key. */
  decide(params: DecideRequestParams): Promise<{ ok: boolean }> {
    return this.client._request<{ ok: boolean }>(
      "POST",
      `/api/v1/requests/${params.requestId}/decide`,
      { decision: params.decision, comment: params.comment },
    );
  }
}

class RequestTypesResource {
  constructor(private readonly client: GovernanceClient) {}

  /** List active request types for the org. */
  list(): Promise<RequestType[]> {
    return this.client._request<RequestType[]>("GET", "/api/v1/request-types");
  }
}
