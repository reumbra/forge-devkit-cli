import { describe, expect, it } from "vitest";
import { getMachineId } from "../../src/lib/machine-id.js";

describe("getMachineId", () => {
  it("returns a 64-char hex string (full SHA256)", () => {
    const id = getMachineId();
    expect(id).toHaveLength(64);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic (same on repeated calls)", () => {
    const a = getMachineId();
    const b = getMachineId();
    expect(a).toBe(b);
  });
});
