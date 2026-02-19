import { describe, expect, it } from "vitest";

const LICENSE_REGEX = /^FRG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;

describe("activate — license key validation", () => {
  it("accepts valid key format", () => {
    expect(LICENSE_REGEX.test("FRG-ABCD-EFGH-2345")).toBe(true);
  });

  it("accepts keys with digits 2-9", () => {
    expect(LICENSE_REGEX.test("FRG-2345-6789-ABCD")).toBe(true);
  });

  it("rejects lowercase", () => {
    expect(LICENSE_REGEX.test("FRG-abcd-EFGH-2345")).toBe(false);
  });

  it("rejects wrong prefix", () => {
    expect(LICENSE_REGEX.test("LIC-ABCD-EFGH-2345")).toBe(false);
  });

  it("rejects digit 0 and 1 (ambiguous with O/I)", () => {
    expect(LICENSE_REGEX.test("FRG-0000-1111-ABCD")).toBe(false);
  });

  it("rejects short segments", () => {
    expect(LICENSE_REGEX.test("FRG-ABC-EFGH-2345")).toBe(false);
  });

  it("rejects extra segments", () => {
    expect(LICENSE_REGEX.test("FRG-ABCD-EFGH-2345-XXXX")).toBe(false);
  });
});
