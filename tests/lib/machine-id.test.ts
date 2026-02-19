import { describe, expect, it } from "vitest";
import { getMachineId } from "../../src/lib/machine-id.js";

describe("getMachineId", () => {
  it("returns a 32-char hex string", () => {
    const id = getMachineId();
    expect(id).toHaveLength(32);
    expect(id).toMatch(/^[0-9a-f]{32}$/);
  });

  it("is deterministic (same on repeated calls)", () => {
    const a = getMachineId();
    const b = getMachineId();
    expect(a).toBe(b);
  });
});
