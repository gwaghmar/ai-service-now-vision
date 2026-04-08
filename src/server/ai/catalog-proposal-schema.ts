import { z } from "zod";

const fieldDef = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum(["text", "textarea"]),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
});

/** LLM structured output for catalog proposals (matches parseFieldSchema). */
export const catalogProposalSchema = z.object({
  requestTypes: z
    .array(
      z.object({
        slug: z
          .string()
          .min(1)
          .max(64)
          .regex(/^[a-z0-9_-]+$/),
        title: z.string().min(1).max(200),
        description: z.string().max(2000).optional(),
        fieldSchema: z.object({
          fields: z.array(fieldDef).min(1),
        }),
        riskDefaults: z.record(z.string(), z.string()).default({}),
      }),
    )
    .min(1)
    .max(14),
});

export type CatalogProposal = z.infer<typeof catalogProposalSchema>;

export const mockCatalogProposal: CatalogProposal = {
  requestTypes: [
    {
      slug: "laptop_request",
      title: "Laptop & hardware",
      description: "Standard laptop or peripheral for employees.",
      fieldSchema: {
        fields: [
          {
            key: "device",
            label: "Device",
            type: "text",
            required: true,
            placeholder: "e.g. 14in laptop",
          },
          {
            key: "justification",
            label: "Justification",
            type: "textarea",
            required: true,
          },
        ],
      },
      riskDefaults: { Asset: "IT asset tag required" },
    },
    {
      slug: "saas_access",
      title: "SaaS / application access",
      description: "Access to a cloud application behind SSO.",
      fieldSchema: {
        fields: [
          {
            key: "app_name",
            label: "Application",
            type: "text",
            required: true,
          },
          {
            key: "role",
            label: "Role / group",
            type: "text",
            required: true,
          },
        ],
      },
      riskDefaults: { IAM: "Least privilege" },
    },
  ],
};
