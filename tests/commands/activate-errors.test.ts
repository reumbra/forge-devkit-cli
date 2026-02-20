import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-activate-err-${randomUUID()}`);
const testForgeDir = join(testDir, ".forge");
const testConfigPath = join(testForgeDir, "config.json");

vi.mock("../../src/lib/paths.js", () => ({
  FORGE_DIR: testForgeDir,
  CONFIG_PATH: testConfigPath,
  CACHE_DIR: join(testForgeDir, "cache"),
  claudePluginDir: () => join(testDir, "plugins"),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit");
});

vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const { activate } = await import("../../src/commands/activate.js");

function writeConfig(overrides?: Record<string, unknown>) {
  mkdirSync(testForgeDir, { recursive: true });
  writeFileSync(
    testConfigPath,
    JSON.stringify({
      license_key: null,
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

function apiSuccess(data: Record<string, unknown>) {
  return {
    ok: true,
    status: 200,
    json: async () => data,
  };
}

describe("activate — API error scenarios", () => {
  beforeEach(() => {
    mkdirSync(testForgeDir, { recursive: true });
    mockFetch.mockReset();
    mockExit.mockClear();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("shows error on MACHINE_LIMIT", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(403, "MACHINE_LIMIT", "All device slots are used"));

    await expect(activate("FRG-TEST-ABCD-EF23")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("shows error on LICENSE_NOT_FOUND", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(404, "LICENSE_NOT_FOUND", "License not found"));

    await expect(activate("FRG-TEST-ABCD-EF23")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("shows error on LICENSE_EXPIRED", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(403, "LICENSE_EXPIRED", "License has expired"));

    await expect(activate("FRG-TEST-ABCD-EF23")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("shows error on INVALID_LICENSE", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(401, "INVALID_LICENSE", "Invalid license key"));

    await expect(activate("FRG-TEST-ABCD-EF23")).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("handles network failure", async () => {
    writeConfig();
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(activate("FRG-TEST-ABCD-EF23")).rejects.toThrow("fetch failed");
  });

  it("succeeds and saves config on valid response", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(
      apiSuccess({
        success: true,
        license: {
          plan: "pro",
          expires_at: "2027-01-01T00:00:00.000Z",
          machines_used: 1,
          max_machines: 3,
        },
      }),
    );

    await activate("FRG-TEST-ABCD-EF23");

    const { loadConfig } = await import("../../src/lib/config.js");
    const config = loadConfig();
    expect(config.license_key).toBe("FRG-TEST-ABCD-EF23");
  });

  it("rejects invalid key format before API call", async () => {
    writeConfig();

    await expect(activate("INVALID-KEY")).rejects.toThrow("process.exit");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
