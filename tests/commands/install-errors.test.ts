import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-install-err-${randomUUID()}`);
const testForgeDir = join(testDir, ".forge");
const testConfigPath = join(testForgeDir, "config.json");
const testCacheDir = join(testForgeDir, "cache");
const testPluginDir = join(testDir, "plugins");

vi.mock("../../src/lib/paths.js", () => ({
  FORGE_DIR: testForgeDir,
  CONFIG_PATH: testConfigPath,
  CACHE_DIR: testCacheDir,
  claudePluginDir: () => testPluginDir,
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit");
});

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const { install } = await import("../../src/commands/install.js");

function writeConfig(overrides?: Record<string, unknown>) {
  mkdirSync(testForgeDir, { recursive: true });
  writeFileSync(
    testConfigPath,
    JSON.stringify({
      license_key: "FRG-TEST-ABCD-EF23",
      machine_id: "test-machine-id",
      api_url: "https://api.test.dev",
      installed_plugins: {},
      ...overrides,
    }),
  );
}

function apiError(status: number, code: string, message: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error: code, message }),
  };
}

describe("install — error scenarios", () => {
  beforeEach(() => {
    mkdirSync(testForgeDir, { recursive: true });
    mkdirSync(testCacheDir, { recursive: true });
    mkdirSync(testPluginDir, { recursive: true });
    mockFetch.mockReset();
    mockExit.mockClear();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("exits if no license key configured", async () => {
    writeConfig({ license_key: null });

    await expect(install("forge-core")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error on PLUGIN_NOT_IN_PLAN", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(
      apiError(403, "PLUGIN_NOT_IN_PLAN", "Plugin not available on your plan"),
    );

    await expect(install("forge-product")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("shows error on VERSION_NOT_FOUND", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(404, "VERSION_NOT_FOUND", "Version 9.9.9 not found"));

    await expect(install("forge-core", "9.9.9")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("shows error on BUNDLE_NOT_AVAILABLE", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(
      apiError(404, "BUNDLE_NOT_AVAILABLE", "Plugin bundle not available"),
    );

    await expect(install("forge-core")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("shows error on LICENSE_INACTIVE", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(403, "LICENSE_INACTIVE", "License is inactive"));

    await expect(install("forge-core")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("handles download failure (presigned URL expired)", async () => {
    writeConfig();
    // First call: POST /plugins/download → success with presigned URL
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        url: "https://s3.example.com/expired-presigned-url",
        plugin_name: "forge-core",
        version: "1.0.0",
        expires_in: 300,
      }),
    });
    // Second call: download from presigned URL → 403 expired
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      statusText: "Forbidden",
    });

    await expect(install("forge-core")).rejects.toThrow("Download failed");
  });

  it("handles network failure during API request", async () => {
    writeConfig();
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(install("forge-core")).rejects.toThrow("fetch failed");
  });

  it("normalizes shorthand name before API call", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(404, "PLUGIN_NOT_FOUND", "Plugin not found"));

    await expect(install("core")).rejects.toThrow("process.exit");

    // Verify the API was called with the full name
    const fetchCall = mockFetch.mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.plugin_name).toBe("forge-core");
  });
});
