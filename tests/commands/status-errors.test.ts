import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-status-err-${randomUUID()}`);
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

const { status } = await import("../../src/commands/status.js");

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

describe("status — error scenarios", () => {
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

    await expect(status()).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error on LICENSE_NOT_FOUND", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(404, "LICENSE_NOT_FOUND", "License not found"));

    await expect(status()).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("handles network failure", async () => {
    writeConfig();
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(status()).rejects.toThrow("fetch failed");
  });

  it("displays license info on success", async () => {
    writeConfig();
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        valid: true,
        license: {
          plan: "pro",
          email: "user@test.com",
          expires_at: "2027-06-01T00:00:00.000Z",
          is_active: true,
          machines: [
            { machine_id: "test-machine-id", label: null, activated_at: "2026-01-01T00:00:00Z" },
          ],
          allowed_plugins: ["forge-core", "forge-product"],
        },
      }),
    });

    await status();

    const output = logs.join("\n");
    expect(output).toContain("pro");
    expect(output).toContain("user@test.com");
    expect(output).toContain("forge-core");
  });

  it("shows expired status when license past expiry", async () => {
    writeConfig();
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        valid: false,
        license: {
          plan: "starter",
          email: "expired@test.com",
          expires_at: "2025-01-01T00:00:00.000Z",
          is_active: true,
          machines: [],
          allowed_plugins: [],
        },
      }),
    });

    await status();

    const output = logs.join("\n");
    expect(output).toContain("expired");
  });
});
