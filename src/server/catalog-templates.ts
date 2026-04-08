import itStartup from "@/data/catalog-templates/it-startup.json";
import healthcareLite from "@/data/catalog-templates/healthcare-lite.json";
import {
  catalogProposalSchema,
  type CatalogProposal,
} from "@/server/ai/catalog-proposal-schema";

const parsedIt = catalogProposalSchema.safeParse(itStartup);
const parsedHc = catalogProposalSchema.safeParse(healthcareLite);

if (!parsedIt.success || !parsedHc.success) {
  throw new Error("Catalog template JSON failed validation");
}

export const CATALOG_TEMPLATES: Record<
  string,
  { label: string; proposal: CatalogProposal }
> = {
  it_startup: { label: "IT / SaaS startup", proposal: parsedIt.data },
  healthcare_lite: {
    label: "Healthcare (lite)",
    proposal: parsedHc.data,
  },
};

export function listCatalogTemplateOptions() {
  return Object.entries(CATALOG_TEMPLATES).map(([id, v]) => ({
    id,
    label: v.label,
  }));
}

export function getCatalogTemplate(id: string): CatalogProposal | null {
  return CATALOG_TEMPLATES[id]?.proposal ?? null;
}
