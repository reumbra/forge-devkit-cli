import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock paths before importing config
const testDir = join(tmpdir(), `forge-test-${randomUUID()}`);
const testConfigPath = join(testDir, "config.json");

vi.mock("../../src/lib/paths.js", () => ({
  FORGE_DIR: testDir,
  CONFIG_PATH: testConfigPath,
  CACHE_DIR: join(testDir, "cache"),
  claudePluginDir: () => join(testDir, "plugins"),
}));

const { loadConfig, saveConfig, ensureForgeDir } = await import("../../src/lib/config.js");

describe("config", () => {
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("loadConfig", () => {
    it("returns defaults when no config exists", () => {
      const config = loadConfig();
      expect(config.license_key).toBeNull();
      expect(config.machine_id).toMatch(/^[0-9a-f]{32}$/);
      expect(config.api_url).toBe("https://api.reumbra.dev");
      expect(config.installed_plugins).toEqual({});
    });

    it("reads existing config file", () => {
      writeFileSync(
        testConfigPath,
        JSON.stringify({
          license_key: "FRG-TEST-1234-ABCD",
          machine_id: "deadbeef",
          api_url: "https://custom.api",
          installed_plugins: { "forge-core": { version: "1.0.0", installed_at: "2026-01-01" } },
        }),
      );

      const config = loadConfig();
      expect(config.license_key).toBe("FRG-TEST-1234-ABCD");
      expect(config.machine_id).toBe("deadbeef");
      expect(config.api_url).toBe("https://custom.api");
      expect(config.installed_plugins["forge-core"].version).toBe("1.0.0");
    });

    it("fills missing fields with defaults", () => {
      writeFileSync(testConfigPath, JSON.stringify({ license_key: "FRG-PART-IALC-ONFG" }));

      const config = loadConfig();
      expect(config.license_key).toBe("FRG-PART-IALC-ONFG");
      expect(config.machine_id).toMatch(/^[0-9a-f]{32}$/);
      expect(config.installed_plugins).toEqual({});
    });

    it("returns defaults on corrupt JSON", () => {
      writeFileSync(testConfigPath, "not json{{{");
      const config = loadConfig();
      expect(config.license_key).toBeNull();
    });
  });

  describe("saveConfig", () => {
    it("writes config as pretty JSON", () => {
      saveConfig({
        license_key: "FRG-SAVE-TEST-1234",
        machine_id: "abc123",
        api_url: "https://api.reumbra.dev",
        installed_plugins: {},
      });

      const raw = readFileSync(testConfigPath, "utf-8");
      expect(raw).toContain('"license_key": "FRG-SAVE-TEST-1234"');
      expect(raw.endsWith("\n")).toBe(true);

      const parsed = JSON.parse(raw);
      expect(parsed.license_key).toBe("FRG-SAVE-TEST-1234");
    });

    it("creates parent directories if needed", () => {
      rmSync(testDir, { recursive: true, force: true });

      saveConfig({
        license_key: null,
        machine_id: "test",
        api_url: "https://api.reumbra.dev",
        installed_plugins: {},
      });

      expect(existsSync(testConfigPath)).toBe(true);
    });
  });

  describe("ensureForgeDir", () => {
    it("creates the forge directory", () => {
      rmSync(testDir, { recursive: true, force: true });

      ensureForgeDir();
      expect(existsSync(testDir)).toBe(true);
    });
  });
});
