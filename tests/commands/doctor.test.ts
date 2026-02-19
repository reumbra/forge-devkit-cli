import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-doctor-${randomUUID()}`);
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

// Suppress console output in tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// Mock fetch for API connectivity check
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { doctor } = await import("../../src/commands/doctor.js");

describe("doctor", () => {
  beforeEach(() => {
    mkdirSync(testForgeDir, { recursive: true });
    mkdirSync(testPluginDir, { recursive: true });
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mockFetch.mockReset();
  });

  it("passes all checks when everything is configured", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-PASS-1234",
        machine_id: "abcdef123456",
        api_url: "https://api.test.dev",
        installed_plugins: {},
      }),
    );

    const result = await doctor();
    expect(result.issues).toBe(0);
    expect(result.checks).toBeGreaterThanOrEqual(6);
  });

  it("reports issue when forge directory is missing", async () => {
    rmSync(testForgeDir, { recursive: true, force: true });

    const result = await doctor();
    expect(result.issues).toBeGreaterThanOrEqual(1);
  });

  it("reports issue when config file is missing", async () => {
    // Forge dir exists but no config file
    const result = await doctor();
    expect(result.issues).toBeGreaterThanOrEqual(1);
  });

  it("reports issue when license key is null", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: null,
        machine_id: "abcdef123456",
        api_url: "https://api.test.dev",
        installed_plugins: {},
      }),
    );

    const result = await doctor();
    expect(result.issues).toBeGreaterThanOrEqual(1);
  });

  it("reports issue when Claude Code plugin dir is missing", async () => {
    rmSync(testPluginDir, { recursive: true, force: true });
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-PLUG-DIR0",
        machine_id: "abcdef123456",
        api_url: "https://api.test.dev",
        installed_plugins: {},
      }),
    );

    const result = await doctor();
    expect(result.issues).toBeGreaterThanOrEqual(1);
  });

  it("reports issue when installed plugin is missing from disk", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-MISS-PLUG",
        machine_id: "abcdef123456",
        api_url: "https://api.test.dev",
        installed_plugins: { "forge-ghost": { version: "1.0.0", installed_at: "2026-01-01" } },
      }),
    );

    const result = await doctor();
    expect(result.issues).toBeGreaterThanOrEqual(1);
  });

  it("detects intact plugin with plugin.json", async () => {
    const pluginPath = join(testPluginDir, "forge-core", ".claude-plugin");
    mkdirSync(pluginPath, { recursive: true });
    writeFileSync(join(pluginPath, "plugin.json"), "{}");
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-GOOD-PLUG",
        machine_id: "abcdef123456",
        api_url: "https://api.test.dev",
        installed_plugins: { "forge-core": { version: "2.0.0", installed_at: "2026-01-01" } },
      }),
    );

    const result = await doctor();
    // All checks should pass (including plugin integrity)
    expect(result.issues).toBe(0);
  });

  it("reports corrupted plugin (missing plugin.json)", async () => {
    const pluginPath = join(testPluginDir, "forge-core");
    mkdirSync(pluginPath, { recursive: true });
    // No .claude-plugin/plugin.json
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-CORR-PLUG",
        machine_id: "abcdef123456",
        api_url: "https://api.test.dev",
        installed_plugins: { "forge-core": { version: "2.0.0", installed_at: "2026-01-01" } },
      }),
    );

    const result = await doctor();
    expect(result.issues).toBeGreaterThanOrEqual(1);
  });

  it("reports API unreachable", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-NAPI-1234",
        machine_id: "abcdef123456",
        api_url: "https://api.test.dev",
        installed_plugins: {},
      }),
    );
    mockFetch.mockRejectedValue(new Error("fetch failed"));

    const result = await doctor();
    expect(result.issues).toBeGreaterThanOrEqual(1);
  });

  it("reports cache stats when cache exists", async () => {
    mkdirSync(testCacheDir, { recursive: true });
    writeFileSync(join(testCacheDir, "test-file"), "cache data");
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-CACH-1234",
        machine_id: "abcdef123456",
        api_url: "https://api.test.dev",
        installed_plugins: {},
      }),
    );

    const result = await doctor();
    expect(result.checks).toBeGreaterThanOrEqual(6);
  });
});
