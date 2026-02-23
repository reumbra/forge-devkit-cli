import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-marketplace-${randomUUID()}`);
const testMarketplaceDir = join(testDir, "marketplace");

vi.mock("../../src/lib/paths.js", () => ({
  MARKETPLACE_DIR: testMarketplaceDir,
  FORGE_DIR: testDir,
  CONFIG_PATH: join(testDir, "config.json"),
  CACHE_DIR: join(testDir, "cache"),
  claudePluginDir: () => join(testDir, ".claude", "plugins"),
  claudeSettingsPath: () => join(testDir, ".claude", "settings.json"),
  claudeKnownMarketplacesPath: () => join(testDir, ".claude", "plugins", "known_marketplaces.json"),
}));

const { ensureMarketplaceDir, updateMarketplaceJson, removeFromMarketplace, readMarketplaceJson } =
  await import("../../src/lib/marketplace.js");

describe("marketplace", () => {
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("ensureMarketplaceDir creates directory structure", () => {
    ensureMarketplaceDir();
    expect(existsSync(join(testMarketplaceDir, ".claude-plugin"))).toBe(true);
    expect(existsSync(join(testMarketplaceDir, "plugins"))).toBe(true);
  });

  it("updateMarketplaceJson adds a new plugin entry", () => {
    ensureMarketplaceDir();
    updateMarketplaceJson("forge-core", "Test plugin", "1.0.0");
    const data = readMarketplaceJson();
    expect(data.plugins).toHaveLength(1);
    expect(data.plugins[0].name).toBe("forge-core");
    expect(data.plugins[0].version).toBe("1.0.0");
    expect(data.plugins[0].source).toBe("./plugins/forge-core");
  });

  it("updateMarketplaceJson updates existing plugin version", () => {
    ensureMarketplaceDir();
    updateMarketplaceJson("forge-core", "Test plugin", "1.0.0");
    updateMarketplaceJson("forge-core", "Test plugin", "2.0.0");
    const data = readMarketplaceJson();
    expect(data.plugins).toHaveLength(1);
    expect(data.plugins[0].version).toBe("2.0.0");
  });

  it("updateMarketplaceJson handles multiple plugins", () => {
    ensureMarketplaceDir();
    updateMarketplaceJson("forge-core", "Core plugin", "1.0.0");
    updateMarketplaceJson("forge-product", "Product plugin", "0.5.0");
    const data = readMarketplaceJson();
    expect(data.plugins).toHaveLength(2);
  });

  it("removeFromMarketplace removes plugin entry", () => {
    ensureMarketplaceDir();
    updateMarketplaceJson("forge-core", "Core", "1.0.0");
    updateMarketplaceJson("forge-product", "Product", "0.5.0");
    removeFromMarketplace("forge-core");
    const data = readMarketplaceJson();
    expect(data.plugins).toHaveLength(1);
    expect(data.plugins[0].name).toBe("forge-product");
  });

  it("removeFromMarketplace is a no-op for unknown plugin", () => {
    ensureMarketplaceDir();
    updateMarketplaceJson("forge-core", "Core", "1.0.0");
    removeFromMarketplace("forge-ghost");
    const data = readMarketplaceJson();
    expect(data.plugins).toHaveLength(1);
  });
});
