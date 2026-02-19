import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-uninstall-${randomUUID()}`);
const testForgeDir = join(testDir, ".forge");
const testConfigPath = join(testForgeDir, "config.json");
const testCacheDir = join(testForgeDir, "cache");
const testPluginDir = join(testDir, ".claude", "plugins");

vi.mock("../../src/lib/paths.js", () => ({
  FORGE_DIR: testForgeDir,
  CONFIG_PATH: testConfigPath,
  CACHE_DIR: testCacheDir,
  claudePluginDir: () => testPluginDir,
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
    mkdirSync(testPluginDir, { recursive: true });
    mkdirSync(testCacheDir, { recursive: true });
    mockExit.mockClear();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("removes plugin from disk, cache, and config", () => {
    // Setup: plugin installed
    const pluginPath = join(testPluginDir, "forge-core");
    mkdirSync(pluginPath, { recursive: true });
    writeFileSync(join(pluginPath, "SKILL.md"), "content");

    const cachePath = join(testCacheDir, "forge-core@1.5.0");
    mkdirSync(cachePath, { recursive: true });

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

    expect(existsSync(pluginPath)).toBe(false);
    expect(existsSync(cachePath)).toBe(false);
    const config = loadConfig();
    expect(config.installed_plugins["forge-core"]).toBeUndefined();
  });

  it("normalizes shorthand names", () => {
    const pluginPath = join(testPluginDir, "forge-qa");
    mkdirSync(pluginPath, { recursive: true });

    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-NORM-NAME",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: { "forge-qa": { version: "0.3.0", installed_at: "2026-01-01" } },
      }),
    );

    uninstall("qa"); // shorthand → forge-qa

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
    const pluginPath = join(testPluginDir, "forge-core");
    mkdirSync(pluginPath, { recursive: true });
    // No cache directory for this version

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
