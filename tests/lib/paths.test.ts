import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  claudeKnownMarketplacesPath,
  claudeSettingsPath,
  FORGE_DIR,
  MARKETPLACE_DIR,
} from "../../src/lib/paths.js";

describe("paths", () => {
  it("FORGE_DIR points to ~/.forge", () => {
    expect(FORGE_DIR).toBe(join(homedir(), ".forge"));
  });

  it("MARKETPLACE_DIR points to ~/.forge/marketplace", () => {
    expect(MARKETPLACE_DIR).toBe(join(homedir(), ".forge", "marketplace"));
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
