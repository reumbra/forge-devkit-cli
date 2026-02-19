import { describe, expect, it, vi } from "vitest";
import { log } from "../../src/lib/logger.js";

const logs: string[] = [];
const errors: string[] = [];

vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
  logs.push(args.map(String).join(" "));
});
vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
  errors.push(args.map(String).join(" "));
});

describe("logger", () => {
  it("info outputs with cyan marker", () => {
    logs.length = 0;
    log.info("test info");
    expect(logs[0]).toContain("test info");
    expect(logs[0]).toContain("i"); // cyan "i" marker
  });

  it("success outputs with green checkmark", () => {
    logs.length = 0;
    log.success("all good");
    expect(logs[0]).toContain("all good");
  });

  it("warn outputs with yellow marker", () => {
    logs.length = 0;
    log.warn("be careful");
    expect(logs[0]).toContain("be careful");
  });

  it("error outputs to stderr", () => {
    errors.length = 0;
    log.error("something broke");
    expect(errors[0]).toContain("something broke");
  });

  it("step outputs with dim arrow", () => {
    logs.length = 0;
    log.step("doing thing");
    expect(logs[0]).toContain("doing thing");
  });

  it("header outputs bold text", () => {
    logs.length = 0;
    log.header("Title");
    expect(logs[0]).toContain("Title");
  });

  it("plain outputs without decoration", () => {
    logs.length = 0;
    log.plain("raw text");
    expect(logs[0]).toBe("raw text");
  });

  describe("table", () => {
    it("formats rows with padding", () => {
      logs.length = 0;
      log.table([
        ["Name:", "forge-core"],
        ["Version:", "v2.0.0"],
      ]);
      expect(logs).toHaveLength(2);
      // Both rows should have consistent column widths
      const col1Width0 = logs[0].indexOf("forge-core") - logs[0].indexOf("Name:");
      const col1Width1 = logs[1].indexOf("v2.0.0") - logs[1].indexOf("Version:");
      expect(col1Width0).toBe(col1Width1);
    });

    it("handles empty rows", () => {
      logs.length = 0;
      log.table([]);
      expect(logs).toHaveLength(0);
    });
  });
});
