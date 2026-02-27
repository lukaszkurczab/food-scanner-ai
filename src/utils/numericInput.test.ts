import { describe, expect, it } from "@jest/globals";
import {
  normalizeNumericInputOnBlur,
  sanitizeNumericInput,
} from "@/utils/numericInput";

describe("sanitizeNumericInput", () => {
  it("returns empty string for empty and non-numeric input", () => {
    expect(sanitizeNumericInput("")).toBe("");
    expect(sanitizeNumericInput("abc")).toBe("");
  });

  it("normalizes commas and strips disallowed characters", () => {
    expect(sanitizeNumericInput("01,23kg")).toBe("1.23");
  });

  it("keeps only first dot and leading decimal is converted to 0.x", () => {
    expect(sanitizeNumericInput("1.2.3.4")).toBe("1.234");
    expect(sanitizeNumericInput(".5")).toBe("0.5");
  });

  it("trims leading zeroes and respects maxDecimals", () => {
    expect(sanitizeNumericInput("00012")).toBe("12");
    expect(sanitizeNumericInput("12.345", { maxDecimals: 2 })).toBe("12.34");
    expect(sanitizeNumericInput("12.345", { maxDecimals: 0 })).toBe("12");
  });

  it("preserves trailing dot when decimals are allowed", () => {
    expect(sanitizeNumericInput("12.")).toBe("12.");
  });
});

describe("normalizeNumericInputOnBlur", () => {
  it("uses fallback when sanitized value is empty", () => {
    expect(normalizeNumericInputOnBlur("abc")).toBe("0");
    expect(normalizeNumericInputOnBlur("", { fallback: "7" })).toBe("7");
  });

  it("removes trailing dot on blur and keeps sanitized value otherwise", () => {
    expect(normalizeNumericInputOnBlur("12.")).toBe("12");
    expect(normalizeNumericInputOnBlur("1.234", { maxDecimals: 1 })).toBe("1.2");
  });
});
