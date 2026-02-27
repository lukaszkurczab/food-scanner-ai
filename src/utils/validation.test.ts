import { describe, expect, it } from "@jest/globals";
import { validateEmail } from "@/utils/validation";

describe("validateEmail", () => {
  it("returns false for empty input", () => {
    expect(validateEmail("")).toBe(false);
  });

  it("accepts valid email and trims surrounding whitespace", () => {
    expect(validateEmail("  user@example.com  ")).toBe(true);
  });

  it("rejects malformed email formats", () => {
    expect(validateEmail("userexample.com")).toBe(false);
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("@example.com")).toBe(false);
    expect(validateEmail("user@domain")).toBe(false);
  });
});
