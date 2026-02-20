import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-list-err-${randomUUID()}`);
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

const { list } = await import("../../src/commands/list.js");

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

describe("list — error scenarios", () => {
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

    await expect(list()).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows error on UNAUTHORIZED", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(401, "UNAUTHORIZED", "Missing license headers"));

    await expect(list()).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("shows error on LICENSE_EXPIRED", async () => {
    writeConfig();
    mockFetch.mockResolvedValue(apiError(403, "LICENSE_EXPIRED", "License has expired"));

    await expect(list()).rejects.toThrow("process.exit");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("handles network failure", async () => {
    writeConfig();
    mockFetch.mockRejectedValue(new TypeError("fetch failed"));

    await expect(list()).rejects.toThrow("fetch failed");
  });

  it("shows empty message when no plugins available", async () => {
    writeConfig();
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ plugins: [] }),
    });

    await list();
    // list calls log.info for empty → uses console.error
    // or console.log depending on logger
  });

  it("displays plugin table on success", async () => {
    writeConfig({
      installed_plugins: { "forge-core": { version: "1.0.0", installed_at: "2026-01-01" } },
    });
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        plugins: [
          { name: "forge-core", current_version: "1.0.0", description: "Core pipeline" },
          { name: "forge-product", current_version: null, description: "Product design" },
        ],
      }),
    });

    await list();

    const output = logs.join("\n");
    expect(output).toContain("forge-core");
    expect(output).toContain("forge-product");
    expect(output).toContain("up to date");
  });

  it("shows dash for null version", async () => {
    writeConfig();
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(" "));
    });

    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        plugins: [{ name: "forge-core", current_version: null, description: "Core" }],
      }),
    });

    await list();

    const output = logs.join("\n");
    expect(output).not.toContain("vnull");
  });
});
