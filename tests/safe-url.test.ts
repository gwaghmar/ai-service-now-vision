import { describe, expect, it } from "vitest";
import { assertSafeOutboundHttpUrl } from "@/lib/safe-url";

describe("assertSafeOutboundHttpUrl", () => {
  it("accepts public https urls", () => {
    expect(assertSafeOutboundHttpUrl("https://example.com/webhook")).toContain(
      "https://example.com/webhook",
    );
  });

  it("rejects localhost and private targets", () => {
    expect(() => assertSafeOutboundHttpUrl("http://localhost:3000")).toThrow();
    expect(() => assertSafeOutboundHttpUrl("http://127.0.0.1:3000")).toThrow();
    expect(() => assertSafeOutboundHttpUrl("http://192.168.1.5/hook")).toThrow();
  });
});
