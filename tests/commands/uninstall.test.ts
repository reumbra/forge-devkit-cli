import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-uninstall-${randomUUID()}`);
const testForgeDir = join(testDir, ".forge");
const testConfigPath = join(testForgeDir, "config.json");
const testCacheDir = join(testForgeDir, "cache");
const testPluginDir = join(testDir, ".claude", "plugins");
const testMarketplaceDir = join(testDir, "marketplace");
const testClaudeDir = join(testDir, ".claude");
const testSettingsPath = join(testClaudeDir, "settings.json");
const testKnownMpPath = join(testClaudeDir, "plugins", "known_marketplaces.json");

vi.mock("../../src/lib/paths.js", () => ({
  FORGE_DIR: testForgeDir,
  LEGACY_FORGE_DIR: "/tmp/no-legacy-forge",
  CONFIG_PATH: testConfigPath,
  CACHE_DIR: testCacheDir,
  MARKETPLACE_DIR: testMarketplaceDir,
  claudePluginDir: () => testPluginDir,
  claudeSettingsPath: () => testSettingsPath,
  claudeKnownMarketplacesPath: () => testKnownMpPath,
}));

// Mock process.exit to prevent test runner from dying
const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit called");
});
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const { uninstall } = await import("../../src/commands/uninstall.js");
const { loadConfig } = await import("../../src/lib/config.js");

describe("uninstall", () => {
  beforeEach(() => {
    mkdirSync(testForgeDir, { recursive: true });
    mkdirSync(testCacheDir, { recursive: true });
    mkdirSync(join(testMarketplaceDir, ".claude-plugin"), { recursive: true });
    mkdirSync(join(testMarketplaceDir, "plugins"), { recursive: true });
    mkdirSync(join(testClaudeDir, "plugins"), { recursive: true });
    mockExit.mockClear();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("removes plugin from marketplace, settings, cache, and config", () => {
    // Setup: plugin in marketplace directory
    const pluginPath = join(testMarketplaceDir, "plugins", "forge-core");
    mkdirSync(pluginPath, { recursive: true });
    writeFileSync(join(pluginPath, "SKILL.md"), "content");

    // marketplace.json with the plugin
    writeFileSync(
      join(testMarketplaceDir, ".claude-plugin", "marketplace.json"),
      JSON.stringify({
        name: "reumbra",
        owner: { name: "Reumbra", email: "support@reumbra.dev" },
        plugins: [
          {
            name: "forge-core",
            source: "./plugins/forge-core",
            description: "Core plugin",
            version: "1.5.0",
          },
        ],
      }),
    );

    // settings.json with enabled plugin
    writeFileSync(
      testSettingsPath,
      JSON.stringify({ enabledPlugins: { "forge-core@reumbra": true } }),
    );

    // Cache
    const cachePath = join(testCacheDir, "forge-core@1.5.0");
    mkdirSync(cachePath, { recursive: true });

    // Forge config
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-UNIN-STAL",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: { "forge-core": { version: "1.5.0", installed_at: "2026-01-01" } },
      }),
    );

    uninstall("forge-core");

    // Plugin dir removed from marketplace
    expect(existsSync(pluginPath)).toBe(false);

    // marketplace.json has no plugins
    const mpData = JSON.parse(
      readFileSync(join(testMarketplaceDir, ".claude-plugin", "marketplace.json"), "utf-8"),
    );
    expect(mpData.plugins).toHaveLength(0);

    // settings.json no longer has forge-core@reumbra
    const settings = JSON.parse(readFileSync(testSettingsPath, "utf-8"));
    expect(settings.enabledPlugins["forge-core@reumbra"]).toBeUndefined();

    // Cache removed
    expect(existsSync(cachePath)).toBe(false);

    // Config updated
    const config = loadConfig();
    expect(config.installed_plugins["forge-core"]).toBeUndefined();
  });

  it("removes marketplace when last plugin uninstalled", () => {
    // Setup: single plugin
    const pluginPath = join(testMarketplaceDir, "plugins", "forge-core");
    mkdirSync(pluginPath, { recursive: true });

    writeFileSync(
      join(testMarketplaceDir, ".claude-plugin", "marketplace.json"),
      JSON.stringify({
        name: "reumbra",
        owner: { name: "Reumbra", email: "support@reumbra.dev" },
        plugins: [
          {
            name: "forge-core",
            source: "./plugins/forge-core",
            description: "Core plugin",
            version: "1.0.0",
          },
        ],
      }),
    );

    writeFileSync(
      testSettingsPath,
      JSON.stringify({ enabledPlugins: { "forge-core@reumbra": true } }),
    );

    // known_marketplaces.json with reumbra entry
    writeFileSync(
      testKnownMpPath,
      JSON.stringify({
        reumbra: {
          source: { source: "directory", path: testMarketplaceDir },
          installLocation: testMarketplaceDir,
          lastUpdated: "2026-01-01T00:00:00.000Z",
        },
      }),
    );

    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-LAST-PLUG",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: { "forge-core": { version: "1.0.0", installed_at: "2026-01-01" } },
      }),
    );

    uninstall("forge-core");

    // known_marketplaces.json should no longer have "reumbra"
    const knownMp = JSON.parse(readFileSync(testKnownMpPath, "utf-8"));
    expect(knownMp.reumbra).toBeUndefined();
  });

  it("normalizes shorthand names", () => {
    const pluginPath = join(testMarketplaceDir, "plugins", "forge-qa");
    mkdirSync(pluginPath, { recursive: true });

    writeFileSync(
      join(testMarketplaceDir, ".claude-plugin", "marketplace.json"),
      JSON.stringify({
        name: "reumbra",
        owner: { name: "Reumbra", email: "support@reumbra.dev" },
        plugins: [
          {
            name: "forge-qa",
            source: "./plugins/forge-qa",
            description: "QA plugin",
            version: "0.3.0",
          },
        ],
      }),
    );

    writeFileSync(
      testSettingsPath,
      JSON.stringify({ enabledPlugins: { "forge-qa@reumbra": true } }),
    );

    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-NORM-NAME",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: { "forge-qa": { version: "0.3.0", installed_at: "2026-01-01" } },
      }),
    );

    uninstall("qa"); // shorthand -> forge-qa

    expect(existsSync(pluginPath)).toBe(false);
    const config = loadConfig();
    expect(config.installed_plugins["forge-qa"]).toBeUndefined();
  });

  it("exits with error if plugin not installed", () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-NOPE-INST",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: {},
      }),
    );

    expect(() => uninstall("forge-ghost")).toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("handles missing cache gracefully", () => {
    const pluginPath = join(testMarketplaceDir, "plugins", "forge-core");
    mkdirSync(pluginPath, { recursive: true });
    // No cache directory for this version

    writeFileSync(
      join(testMarketplaceDir, ".claude-plugin", "marketplace.json"),
      JSON.stringify({
        name: "reumbra",
        owner: { name: "Reumbra", email: "support@reumbra.dev" },
        plugins: [
          {
            name: "forge-core",
            source: "./plugins/forge-core",
            description: "Core plugin",
            version: "1.0.0",
          },
        ],
      }),
    );

    writeFileSync(
      testSettingsPath,
      JSON.stringify({ enabledPlugins: { "forge-core@reumbra": true } }),
    );

    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-NOCA-CHE0",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: { "forge-core": { version: "1.0.0", installed_at: "2026-01-01" } },
      }),
    );

    // Should not throw
    uninstall("forge-core");
    expect(existsSync(pluginPath)).toBe(false);
  });
});
