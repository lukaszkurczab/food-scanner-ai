import { describe, expect, it } from "@jest/globals";
import {
  asBoolean,
  asNumber,
  asString,
  asStringArray,
  isRecord,
} from "@/services/contracts/guards";

describe("guards", () => {
  it("checks record values correctly", () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord(null)).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
    expect(isRecord("text")).toBe(false);
  });

  it("parses scalar values to typed outputs", () => {
    expect(asString("abc")).toBe("abc");
    expect(asString(1)).toBeUndefined();

    expect(asNumber(42)).toBe(42);
    expect(asNumber(Number.NaN)).toBeUndefined();
    expect(asNumber(Infinity)).toBeUndefined();

    expect(asBoolean(true)).toBe(true);
    expect(asBoolean("true")).toBeUndefined();
  });

  it("returns only string items from arrays", () => {
    expect(asStringArray(["a", 1, "b", null])).toEqual(["a", "b"]);
    expect(asStringArray("not-array")).toEqual([]);
  });
});
