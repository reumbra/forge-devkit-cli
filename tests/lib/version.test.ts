import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock paths to avoid real config reads inside getVersion → package.json
vi.mock("../../src/lib/paths.js", () => ({
  FORGE_DIR: "/tmp/forge-test",
  CONFIG_PATH: "/tmp/forge-test/config.json",
  CACHE_DIR: "/tmp/forge-test/cache",
  claudePluginDir: () => "/tmp/forge-test/plugins",
}));

const { compareSemver, shouldCheck, fetchLatestVersion, checkForUpdate, getVersion } = await import(
  "../../src/lib/version.js"
);

describe("version", () => {
  describe("getVersion", () => {
    it("returns a semver string", () => {
      const v = getVersion();
      expect(v).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("compareSemver", () => {
    it("returns 0 for equal versions", () => {
      expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
    });

    it("returns 1 when a > b (major)", () => {
      expect(compareSemver("2.0.0", "1.9.9")).toBe(1);
    });

    it("returns -1 when a < b (minor)", () => {
      expect(compareSemver("1.0.0", "1.1.0")).toBe(-1);
    });

    it("returns 1 when a > b (patch)", () => {
      expect(compareSemver("1.0.2", "1.0.1")).toBe(1);
    });

    it("returns -1 when a < b (major)", () => {
      expect(compareSemver("0.9.9", "1.0.0")).toBe(-1);
    });
  });

  describe("shouldCheck", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("returns true when no last check", () => {
      expect(shouldCheck()).toBe(true);
      expect(shouldCheck(undefined)).toBe(true);
    });

    it("returns false when checked recently", () => {
      const recent = new Date().toISOString();
      expect(shouldCheck(recent)).toBe(false);
    });

    it("returns true when >4 hours have passed", () => {
      const old = new Date().toISOString();
      vi.advanceTimersByTime(4 * 60 * 60 * 1000 + 1);
      expect(shouldCheck(old)).toBe(true);
    });
  });

  describe("fetchLatestVersion", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("returns version from npm registry", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ version: "9.8.7" }),
        }),
      );

      const result = await fetchLatestVersion();
      expect(result).toBe("9.8.7");
    });

    it("returns null on network error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

      const result = await fetchLatestVersion();
      expect(result).toBeNull();
    });

    it("returns null on non-ok response", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

      const result = await fetchLatestVersion();
      expect(result).toBeNull();
    });
  });

  describe("checkForUpdate", () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.useRealTimers();
    });

    it("returns null when shouldCheck is false", async () => {
      const result = await checkForUpdate(new Date().toISOString());
      expect(result).toBeNull();
    });

    it("returns UpdateInfo with updateAvailable=true when newer version exists", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ version: "99.0.0" }),
        }),
      );

      const result = await checkForUpdate();
      expect(result).not.toBeNull();
      expect(result?.updateAvailable).toBe(true);
      expect(result?.latest).toBe("99.0.0");
    });

    it("returns UpdateInfo with updateAvailable=false when on latest", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ version: "0.0.1" }),
        }),
      );

      const result = await checkForUpdate();
      expect(result).not.toBeNull();
      expect(result?.updateAvailable).toBe(false);
    });

    it("returns null when fetch fails", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("fail")));

      const result = await checkForUpdate();
      expect(result).toBeNull();
    });
  });
});
