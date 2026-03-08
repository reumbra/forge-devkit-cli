import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  claudeKnownMarketplacesPath,
  claudeSettingsPath,
  FORGE_DIR,
  MARKETPLACE_DIR,
} from "../../src/lib/paths.js";

function expectedConfigDir(): string {
  switch (process.platform) {
    case "win32":
      return join(process.env.APPDATA || join(homedir(), "AppData", "Roaming"), "forge-devkit");
    case "darwin":
      return join(homedir(), "Library", "Application Support", "forge-devkit");
    default:
      return join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "forge-devkit");
  }
}

describe("paths", () => {
  it("FORGE_DIR points to OS-standard config dir", () => {
    expect(FORGE_DIR).toBe(expectedConfigDir());
  });

  it("MARKETPLACE_DIR is under config dir", () => {
    expect(MARKETPLACE_DIR).toBe(join(expectedConfigDir(), "marketplace"));
  });

  it("claudeSettingsPath returns ~/.claude/settings.json", () => {
    expect(claudeSettingsPath()).toBe(join(homedir(), ".claude", "settings.json"));
  });

  it("claudeKnownMarketplacesPath returns correct path", () => {
    expect(claudeKnownMarketplacesPath()).toBe(
      join(homedir(), ".claude", "plugins", "known_marketplaces.json"),
    );
  });
});
