import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-claude-int-${randomUUID()}`);
const testMarketplaceDir = join(testDir, "marketplace");
const testClaudeDir = join(testDir, ".claude");
const testSettingsPath = join(testClaudeDir, "settings.json");
const testKnownMpPath = join(testClaudeDir, "plugins", "known_marketplaces.json");
const testInstalledPluginsPath = join(testClaudeDir, "plugins", "installed_plugins.json");
const testPluginCacheDir = join(testClaudeDir, "plugins", "cache");

vi.mock("../../src/lib/paths.js", () => ({
  MARKETPLACE_DIR: testMarketplaceDir,
  FORGE_DIR: testDir,
  CONFIG_PATH: join(testDir, "config.json"),
  CACHE_DIR: join(testDir, "cache"),
  claudePluginDir: () => join(testClaudeDir, "plugins"),
  claudeSettingsPath: () => testSettingsPath,
  claudeKnownMarketplacesPath: () => testKnownMpPath,
  claudeInstalledPluginsPath: () => testInstalledPluginsPath,
  claudePluginCacheDir: () => testPluginCacheDir,
}));

const {
  registerMarketplace,
  enablePlugin,
  disablePlugin,
  isPluginEnabled,
  removeMarketplace,
  invalidatePluginCache,
} = await import("../../src/lib/claude-integration.js");

describe("claude-integration", () => {
  beforeEach(() => {
    mkdirSync(join(testClaudeDir, "plugins"), { recursive: true });
    mkdirSync(testMarketplaceDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("registerMarketplace", () => {
    it("creates known_marketplaces.json if missing", () => {
      registerMarketplace();
      const data = JSON.parse(readFileSync(testKnownMpPath, "utf-8"));
      expect(data.reumbra).toBeDefined();
      expect(data.reumbra.source.source).toBe("directory");
      expect(data.reumbra.installLocation).toBe(testMarketplaceDir);
    });

    it("merges into existing known_marketplaces.json", () => {
      writeFileSync(
        testKnownMpPath,
        JSON.stringify({
          "claude-plugins-official": {
            source: { source: "github", repo: "anthropics/claude-plugins-official" },
            installLocation: "/some/path",
          },
        }),
      );
      registerMarketplace();
      const data = JSON.parse(readFileSync(testKnownMpPath, "utf-8"));
      expect(data["claude-plugins-official"]).toBeDefined();
      expect(data.reumbra).toBeDefined();
    });

    it("skips if reumbra already registered", () => {
      registerMarketplace();
      const _before = readFileSync(testKnownMpPath, "utf-8");
      registerMarketplace();
      const after = readFileSync(testKnownMpPath, "utf-8");
      // Should not throw, content should be similar (timestamps may differ)
      expect(JSON.parse(after).reumbra).toBeDefined();
    });
  });

  describe("enablePlugin / disablePlugin / isPluginEnabled", () => {
    it("enables a plugin in settings.json", () => {
      writeFileSync(testSettingsPath, JSON.stringify({ enabledPlugins: {} }));
      enablePlugin("forge-core");
      const data = JSON.parse(readFileSync(testSettingsPath, "utf-8"));
      expect(data.enabledPlugins["forge-core@reumbra"]).toBe(true);
    });

    it("preserves existing settings when enabling", () => {
      writeFileSync(
        testSettingsPath,
        JSON.stringify({
          language: "Russian",
          enabledPlugins: { "pm-core@marisko-skills": true },
        }),
      );
      enablePlugin("forge-core");
      const data = JSON.parse(readFileSync(testSettingsPath, "utf-8"));
      expect(data.language).toBe("Russian");
      expect(data.enabledPlugins["pm-core@marisko-skills"]).toBe(true);
      expect(data.enabledPlugins["forge-core@reumbra"]).toBe(true);
    });

    it("creates settings.json with enabledPlugins if missing", () => {
      enablePlugin("forge-core");
      const data = JSON.parse(readFileSync(testSettingsPath, "utf-8"));
      expect(data.enabledPlugins["forge-core@reumbra"]).toBe(true);
    });

    it("disablePlugin removes from enabledPlugins", () => {
      writeFileSync(
        testSettingsPath,
        JSON.stringify({ enabledPlugins: { "forge-core@reumbra": true } }),
      );
      disablePlugin("forge-core");
      const data = JSON.parse(readFileSync(testSettingsPath, "utf-8"));
      expect(data.enabledPlugins["forge-core@reumbra"]).toBeUndefined();
    });

    it("isPluginEnabled returns correct status", () => {
      writeFileSync(
        testSettingsPath,
        JSON.stringify({
          enabledPlugins: { "forge-core@reumbra": true, "forge-old@reumbra": false },
        }),
      );
      expect(isPluginEnabled("forge-core")).toBe(true);
      expect(isPluginEnabled("forge-old")).toBe(false);
      expect(isPluginEnabled("forge-ghost")).toBe(false);
    });
  });

  describe("removeMarketplace", () => {
    it("removes reumbra from known_marketplaces.json", () => {
      writeFileSync(
        testKnownMpPath,
        JSON.stringify({
          "claude-plugins-official": { source: { source: "github" } },
          reumbra: { source: { source: "directory" } },
        }),
      );
      removeMarketplace();
      const data = JSON.parse(readFileSync(testKnownMpPath, "utf-8"));
      expect(data.reumbra).toBeUndefined();
      expect(data["claude-plugins-official"]).toBeDefined();
    });
  });

  describe("invalidatePluginCache", () => {
    it("removes plugin entry from installed_plugins.json, preserves other entries", () => {
      writeFileSync(
        testInstalledPluginsPath,
        JSON.stringify({
          plugins: {
            "forge-core@reumbra": { installPath: "/old/path", version: "1.0.0" },
            "other-plugin@other": { installPath: "/other/path", version: "2.0.0" },
          },
        }),
      );
      invalidatePluginCache("forge-core");
      const data = JSON.parse(readFileSync(testInstalledPluginsPath, "utf-8"));
      expect(data.plugins["forge-core@reumbra"]).toBeUndefined();
      expect(data.plugins["other-plugin@other"]).toBeDefined();
    });

    it("removes all version directories from cache", () => {
      const cacheDir = join(testPluginCacheDir, "reumbra", "forge-core");
      mkdirSync(join(cacheDir, "1.0.0"), { recursive: true });
      mkdirSync(join(cacheDir, "2.0.0"), { recursive: true });
      writeFileSync(join(cacheDir, "1.0.0", "SKILL.md"), "old");
      writeFileSync(join(cacheDir, "2.0.0", "SKILL.md"), "new");

      invalidatePluginCache("forge-core");

      expect(existsSync(cacheDir)).toBe(false);
    });

    it("handles missing installed_plugins.json gracefully", () => {
      expect(() => invalidatePluginCache("forge-core")).not.toThrow();
    });

    it("handles missing cache directory gracefully", () => {
      writeFileSync(
        testInstalledPluginsPath,
        JSON.stringify({
          plugins: { "forge-core@reumbra": { installPath: "/old" } },
        }),
      );
      // No cache dir exists — should not throw
      expect(() => invalidatePluginCache("forge-core")).not.toThrow();
      const data = JSON.parse(readFileSync(testInstalledPluginsPath, "utf-8"));
      expect(data.plugins["forge-core@reumbra"]).toBeUndefined();
    });

    it("does not crash on corrupt JSON in installed_plugins.json", () => {
      writeFileSync(testInstalledPluginsPath, "not valid json{{{");
      expect(() => invalidatePluginCache("forge-core")).not.toThrow();
    });
  });
});
