/** Structured denial from external / inline policy evaluation. */
export class PolicyDeniedError extends Error {
  constructor(public readonly reason?: string) {
    super(reason ?? "Policy denied");
    this.name = "PolicyDeniedError";
  }
}
