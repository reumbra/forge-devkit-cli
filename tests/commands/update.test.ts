import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-update-${randomUUID()}`);
const testForgeDir = join(testDir, ".forge");
const testConfigPath = join(testForgeDir, "config.json");

vi.mock("../../src/lib/paths.js", () => ({
  FORGE_DIR: testForgeDir,
  CONFIG_PATH: testConfigPath,
  CACHE_DIR: join(testForgeDir, "cache"),
  claudePluginDir: () => join(testDir, ".claude", "plugins"),
}));

// Mock install to track calls without hitting API
const installCalls: Array<{ plugin: string; version?: string }> = [];
vi.mock("../../src/commands/install.js", () => ({
  install: async (plugin: string, version?: string) => {
    installCalls.push({ plugin, version });
  },
}));

const mockExit = vi.spyOn(process, "exit").mockImplementation(() => {
  throw new Error("process.exit called");
});
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

const { update } = await import("../../src/commands/update.js");

describe("update", () => {
  beforeEach(() => {
    mkdirSync(testForgeDir, { recursive: true });
    installCalls.length = 0;
    mockExit.mockClear();
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("exits if no license key", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: null,
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: {},
      }),
    );

    await expect(update()).rejects.toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("warns when no plugins installed", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-UPDT-NONE",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: {},
      }),
    );

    await update();
    expect(installCalls).toHaveLength(0);
  });

  it("updates all installed plugins when no name given", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-UPDT-ALL0",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: {
          "forge-core": { version: "1.0.0", installed_at: "2026-01-01" },
          "forge-qa": { version: "0.2.0", installed_at: "2026-01-01" },
        },
      }),
    );

    await update();
    expect(installCalls).toHaveLength(2);
    expect(installCalls[0].plugin).toBe("forge-core");
    expect(installCalls[1].plugin).toBe("forge-qa");
  });

  it("updates single plugin by name", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-UPDT-ONE0",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: {
          "forge-core": { version: "1.0.0", installed_at: "2026-01-01" },
          "forge-qa": { version: "0.2.0", installed_at: "2026-01-01" },
        },
      }),
    );

    await update("forge-core");
    expect(installCalls).toHaveLength(1);
    expect(installCalls[0].plugin).toBe("forge-core");
  });

  it("normalizes shorthand plugin name", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-UPDT-SHRT",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: {
          "forge-core": { version: "1.0.0", installed_at: "2026-01-01" },
        },
      }),
    );

    await update("core");
    expect(installCalls).toHaveLength(1);
    expect(installCalls[0].plugin).toBe("forge-core");
  });

  it("exits if specified plugin not installed", async () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-TEST-UPDT-MISS",
        machine_id: "abc123",
        api_url: "https://api.test.dev",
        installed_plugins: {
          "forge-core": { version: "1.0.0", installed_at: "2026-01-01" },
        },
      }),
    );

    await expect(update("forge-ghost")).rejects.toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);
  });
});
