import { randomUUID } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const testDir = join(tmpdir(), `forge-config-${randomUUID()}`);
const testForgeDir = join(testDir, ".forge");
const testConfigPath = join(testForgeDir, "config.json");

vi.mock("../../src/lib/paths.js", () => ({
  FORGE_DIR: testForgeDir,
  CONFIG_PATH: testConfigPath,
  CACHE_DIR: join(testForgeDir, "cache"),
  claudePluginDir: () => join(testDir, ".claude", "plugins"),
}));

const logs: string[] = [];
vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
  logs.push(args.map(String).join(" "));
});

const { showConfig } = await import("../../src/commands/config.js");

describe("config command", () => {
  beforeEach(() => {
    mkdirSync(testForgeDir, { recursive: true });
    logs.length = 0;
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("shows warning when no config exists", () => {
    rmSync(testForgeDir, { recursive: true, force: true });
    showConfig();
    expect(logs.some((l) => l.includes("No config file found"))).toBe(true);
  });

  it("shows masked license key", () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-ABCD-EFGH-1234",
        machine_id: "abc123def456",
        api_url: "https://api.reumbra.dev",
        installed_plugins: {},
      }),
    );

    showConfig();

    const output = logs.join("\n");
    // Should mask middle part: "FRG-ABCD..1234"
    expect(output).toContain("FRG-ABCD");
    expect(output).toContain("1234");
    expect(output).not.toContain("EFGH");
  });

  it("shows installed plugins", () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-SHOW-PLUG-LIST",
        machine_id: "abc123",
        api_url: "https://api.reumbra.dev",
        installed_plugins: {
          "forge-core": { version: "2.0.0", installed_at: "2026-02-19T10:00:00Z" },
        },
      }),
    );

    showConfig();

    const output = logs.join("\n");
    expect(output).toContain("forge-core");
    expect(output).toContain("v2.0.0");
  });

  it("shows 'not set' when license key is null", () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: null,
        machine_id: "abc123",
        api_url: "https://api.reumbra.dev",
        installed_plugins: {},
      }),
    );

    showConfig();

    const output = logs.join("\n");
    expect(output).toContain("(not set)");
  });

  it("shows 'no plugins installed' message", () => {
    writeFileSync(
      testConfigPath,
      JSON.stringify({
        license_key: "FRG-NOPE-PLUG-INST",
        machine_id: "abc123",
        api_url: "https://api.reumbra.dev",
        installed_plugins: {},
      }),
    );

    showConfig();

    const output = logs.join("\n");
    expect(output).toContain("No plugins installed");
  });
});
