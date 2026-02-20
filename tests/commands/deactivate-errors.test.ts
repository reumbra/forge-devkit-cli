import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-deact-err-${randomUUID()}`);
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

const { deactivate } = await import("../../src/commands/deactivate.js");

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

describe("deactivate — error scenarios", () => {
  beforeEach(() => {
    mkdirSync(testForgeDir, { recursive: true });
    mockFetch.mockReset();
    mockExit.mockClear();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("exits if no license key configured", async () => {
    writeConfig({ license_key: null });

    await expect(deactivate()).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error on LICENSE_NOT_FOUND", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(404, "LICENSE_NOT_FOUND", "License not found"));

    await expect(deactivate()).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("shows error on MACHINE_NOT_FOUND", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(404, "MACHINE_NOT_FOUND", "Machine not registered"));

    await expect(deactivate()).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("handles network failure", async () => {
    writeConfig();
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(deactivate()).rejects.toThrow("fetch failed");
  });

  it("clears license key on success", async () => {
    writeConfig();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await deactivate();

    const saved = JSON.parse(readFileSync(testConfigPath, "utf-8"));
    expect(saved.license_key).toBeNull();
  });

  it("sends correct body to API", async () => {
    writeConfig();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });

    await deactivate();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/auth/deactivate");
    const body = JSON.parse(opts.body);
    expect(body.license_key).toBe("FRG-TEST-ABCD-EF23");
    expect(body.machine_id).toBe("test-machine-id");
  });
});
