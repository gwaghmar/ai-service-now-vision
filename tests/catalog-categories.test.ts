import { describe, expect, it } from "vitest";
import { groupCatalogTiles } from "@/lib/catalog-categories";

describe("groupCatalogTiles", () => {
  it("groups known slugs into workplace and other categories", () => {
    const catalog = [
      {
        id: "1",
        slug: "hardware_laptop",
        title: "Laptop",
        description: null,
      },
      {
        id: "2",
        slug: "custom_new_type",
        title: "Custom",
        description: "x",
      },
    ];
    const groups = groupCatalogTiles(catalog);
    const ids = groups.map((g) => g.id);
    expect(ids).toContain("workplace_onboarding");
    expect(ids).toContain("other_services");
    const workplace = groups.find((g) => g.id === "workplace_onboarding");
    expect(workplace?.items).toHaveLength(1);
    expect(workplace?.items[0]?.slug).toBe("hardware_laptop");
    const other = groups.find((g) => g.id === "other_services");
    expect(other?.items.some((t) => t.slug === "custom_new_type")).toBe(true);
  });
});
