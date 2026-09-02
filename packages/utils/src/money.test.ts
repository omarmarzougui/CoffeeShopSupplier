import { describe, expect, it } from "vitest";
import { formatMinorUnits } from "./money";

describe("formatMinorUnits", () => {
  it("formats positive amounts", () => {
    expect(formatMinorUnits(1250)).toBe("12.50 TND");
  });

  it("pads minor units", () => {
    expect(formatMinorUnits(5)).toBe("0.05 TND");
  });

  it("handles negative amounts", () => {
    expect(formatMinorUnits(-300)).toBe("-3.00 TND");
  });

  it("supports other currencies", () => {
    expect(formatMinorUnits(999, "EUR")).toBe("9.99 EUR");
  });
});
