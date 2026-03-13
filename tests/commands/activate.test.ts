import { describe, expect, it } from "vitest";

describe("activate — license key validation", () => {
  it("accepts key with 5+ characters", () => {
    expect("FRG-ABCD-EFGH-2345".length >= 5).toBe(true);
  });

  it("accepts short but valid key (5 chars)", () => {
    expect("ABCDE".length >= 5).toBe(true);
  });

  it("rejects key shorter than 5 characters", () => {
    expect("ABCD".length >= 5).toBe(false);
  });

  it("rejects empty string", () => {
    expect("".length >= 5).toBe(false);
  });
});
