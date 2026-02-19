import { describe, expect, it } from "vitest";

/** Plugin name normalization logic (extracted from install.ts) */
function normalizePluginName(name: string): string {
  return name.startsWith("forge-") ? name : `forge-${name}`;
}

describe("install — plugin name normalization", () => {
  it("prefixes shorthand names with forge-", () => {
    expect(normalizePluginName("core")).toBe("forge-core");
    expect(normalizePluginName("product")).toBe("forge-product");
    expect(normalizePluginName("qa")).toBe("forge-qa");
  });

  it("keeps already-prefixed names as-is", () => {
    expect(normalizePluginName("forge-core")).toBe("forge-core");
    expect(normalizePluginName("forge-custom")).toBe("forge-custom");
  });

  it("handles edge cases", () => {
    expect(normalizePluginName("forge-")).toBe("forge-");
    expect(normalizePluginName("f")).toBe("forge-f");
  });
});
