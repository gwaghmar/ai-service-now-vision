import { z } from "zod";

export type FieldDefinition = {
  key: string;
  label: string;
  type: "text" | "textarea";
  required?: boolean;
  placeholder?: string;
};

export type FieldSchemaJson = {
  fields: FieldDefinition[];
};

export function parseFieldSchema(raw: unknown): FieldSchemaJson {
  const field = z.object({
    key: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(["text", "textarea"]),
    required: z.boolean().optional(),
    placeholder: z.string().optional(),
  });
  return z.object({ fields: z.array(field).min(1) }).parse(raw);
}

export function buildPayloadSchema(fields: FieldDefinition[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const f of fields) {
    let s: z.ZodTypeAny = z.string().trim();
    if (f.required !== false) {
      s = (s as z.ZodString).min(1, `${f.label} is required`);
    } else {
      s = (s as z.ZodString).optional();
    }
    shape[f.key] = s;
  }
  return z.object(shape);
}
