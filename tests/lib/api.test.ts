import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/lib/api.js";
import type { ForgeConfig } from "../../src/types.js";

function mockConfig(overrides?: Partial<ForgeConfig>): ForgeConfig {
  return {
    license_key: "FRG-TEST-1234-ABCD",
    machine_id: "abc123def456",
    api_url: "https://api.test.dev",
    installed_plugins: {},
    ...overrides,
  };
}

describe("ApiError", () => {
  it("has statusCode, code, and message", () => {
    const err = new ApiError(403, "MACHINE_LIMIT", "All device slots used");
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("MACHINE_LIMIT");
    expect(err.message).toBe("All device slots used");
    expect(err.name).toBe("ApiError");
  });

  it("is instance of Error", () => {
    const err = new ApiError(404, "NOT_FOUND", "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
  });
});

describe("apiRequest URL building", () => {
  it("constructs correct URL from config.api_url + path", () => {
    const config = mockConfig();
    const url = new URL("/auth/activate", config.api_url);
    expect(url.toString()).toBe("https://api.test.dev/auth/activate");
  });

  it("appends query parameters", () => {
    const config = mockConfig();
    const url = new URL("/auth/status", config.api_url);
    url.searchParams.set("license_key", config.license_key as string);
    expect(url.toString()).toContain("license_key=FRG-TEST-1234-ABCD");
  });
});

describe("header construction", () => {
  it("includes license and machine headers", () => {
    const config = mockConfig();
    const headers: Record<string, string> = {};
    if (config.license_key) headers["x-license-key"] = config.license_key;
    if (config.machine_id) headers["x-machine-id"] = config.machine_id;

    expect(headers["x-license-key"]).toBe("FRG-TEST-1234-ABCD");
    expect(headers["x-machine-id"]).toBe("abc123def456");
  });

  it("skips license header when null", () => {
    const config = mockConfig({ license_key: null });
    const headers: Record<string, string> = {};
    if (config.license_key) headers["x-license-key"] = config.license_key;
    if (config.machine_id) headers["x-machine-id"] = config.machine_id;

    expect(headers["x-license-key"]).toBeUndefined();
    expect(headers["x-machine-id"]).toBe("abc123def456");
  });
});
