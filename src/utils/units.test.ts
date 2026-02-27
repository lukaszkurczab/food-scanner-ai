import { describe, expect, it } from "@jest/globals";
import { cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from "@/utils/units";

describe("units conversion helpers", () => {
  it("converts centimeters to feet and inches", () => {
    expect(cmToFtIn(180)).toEqual({ ft: 5, inch: 11 });
  });

  it("converts feet and inches to centimeters", () => {
    expect(ftInToCm(5, 11)).toBe(180);
  });

  it("converts kilograms and pounds using rounded values", () => {
    expect(kgToLbs(70)).toBe(154);
    expect(lbsToKg(154)).toBe(70);
  });
});
