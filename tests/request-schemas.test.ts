import { describe, expect, it } from "vitest";
import {
  buildPayloadSchema,
  parseFieldSchema,
} from "@/lib/request-schemas";

describe("parseFieldSchema", () => {
  it("accepts a valid catalog schema", () => {
    const raw = {
      fields: [
        {
          key: "reason",
          label: "Reason",
          type: "textarea",
          required: true,
        },
      ],
    };
    const parsed = parseFieldSchema(raw);
    expect(parsed.fields[0].key).toBe("reason");
  });

  it("rejects invalid shape", () => {
    expect(() => parseFieldSchema({ fields: [] })).toThrow();
  });
});

describe("buildPayloadSchema", () => {
  it("requires marked fields", () => {
    const schema = buildPayloadSchema([
      { key: "a", label: "A", type: "text", required: true },
    ]);
    expect(schema.safeParse({}).success).toBe(false);
    expect(schema.safeParse({ a: "ok" }).success).toBe(true);
  });
});
