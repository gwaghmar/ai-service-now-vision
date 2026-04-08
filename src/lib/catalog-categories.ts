/**
 * Service catalog categories — user-centric groupings aligned with common ITSM
 * / service catalog practice (hardware & workplace, applications, access, data,
 * infrastructure & change, vendor/risk, emerging capabilities). See Atlassian /
 * InvGate / ServiceNow catalog guidance: categories should reflect how employees
 * look for help, not only internal team structure.
 *
 * Mapping is by `request_type.slug` so admin-created types land in "Other services"
 * until explicitly categorized.
 */

export type CatalogTileLike = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
};

export type CatalogCategoryGroup = {
  id: string;
  title: string;
  subtitle: string;
  sortOrder: number;
  items: CatalogTileLike[];
};

type CategoryDef = {
  id: string;
  title: string;
  subtitle: string;
  sortOrder: number;
  slugs: readonly string[];
};

/**
 * Ordered category definitions. Only groups with at least one matching tile appear.
 * Slugs can be shared across defs only if listed once — first match wins; avoid duplicates.
 */
const CATEGORY_DEFINITIONS: readonly CategoryDef[] = [
  {
    id: "workplace_onboarding",
    title: "Workplace & onboarding",
    subtitle:
      "Day-one setup: devices you work on, how you get on-site, and where to get help.",
    sortOrder: 10,
    slugs: ["hardware_laptop", "physical_access"],
  },
  {
    id: "applications_software",
    title: "Applications & software",
    subtitle:
      "Named licenses, department tools, and new apps behind single sign-on.",
    sortOrder: 20,
    slugs: ["software_license", "saas_application"],
  },
  {
    id: "access_identity",
    title: "Access, identity & connectivity",
    subtitle:
      "Remote connectivity, elevated privileges, and how you reach internal systems.",
    sortOrder: 30,
    slugs: ["vpn_remote_access", "privileged_account"],
  },
  {
    id: "data_analytics",
    title: "Data & analytics access",
    subtitle:
      "Governed access to clinical, operational, and research data with minimum necessary scope.",
    sortOrder: 40,
    slugs: ["human_data_access"],
  },
  {
    id: "infrastructure_change",
    title: "Infrastructure, cloud & change",
    subtitle:
      "Capacity, cost, and controlled changes to production systems.",
    sortOrder: 50,
    slugs: ["cloud_compute", "production_change"],
  },
  {
    id: "vendor_risk",
    title: "Vendors, contracts & risk acceptance",
    subtitle:
      "Third parties touching data or systems, and exceptions when a control cannot be met.",
    sortOrder: 60,
    slugs: ["vendor_third_party", "security_exception"],
  },
  {
    id: "automation_ai",
    title: "Automation & AI",
    subtitle:
      "New tools or expanded scope for AI assistants and integrations.",
    sortOrder: 70,
    slugs: ["agent_tool_scope"],
  },
] as const;

const ORDERED_DEFS = [...CATEGORY_DEFINITIONS].sort(
  (a, b) => a.sortOrder - b.sortOrder,
);

export function groupCatalogTiles(
  catalog: CatalogTileLike[],
): CatalogCategoryGroup[] {
  const bySlug = new Map(catalog.map((t) => [t.slug, t]));
  const usedSlugs = new Set<string>();
  const groups: CatalogCategoryGroup[] = [];

  for (const def of ORDERED_DEFS) {
    const items: CatalogTileLike[] = [];
    for (const slug of def.slugs) {
      const tile = bySlug.get(slug);
      if (tile) {
        items.push(tile);
        usedSlugs.add(slug);
      }
    }
    if (items.length > 0) {
      groups.push({
        id: def.id,
        title: def.title,
        subtitle: def.subtitle,
        sortOrder: def.sortOrder,
        items,
      });
    }
  }

  const otherItems = catalog.filter((t) => !usedSlugs.has(t.slug));
  if (otherItems.length > 0) {
    groups.push({
      id: "other_services",
      title: "Other services",
      subtitle:
        "Additional request types. Ask an admin to place these in a category if needed.",
      sortOrder: 1000,
      items: [...otherItems].sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
      ),
    });
  }

  return groups;
}
