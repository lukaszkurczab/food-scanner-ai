import { describe, expect, it, jest } from "@jest/globals";
import { assertNoUndefined, findUndefinedPaths } from "@/utils/findUndefined";

describe("findUndefinedPaths", () => {
  it("returns empty list for non-record values", () => {
    expect(findUndefinedPaths(null)).toEqual([]);
    expect(findUndefinedPaths("text")).toEqual([]);
    expect(findUndefinedPaths([1, 2, 3])).toEqual([]);
  });

  it("finds undefined in nested objects and arrays", () => {
    const input = {
      top: undefined,
      nested: {
        value: 1,
        inner: undefined,
      },
      list: [1, undefined, { deep: undefined }],
    };

    expect(findUndefinedPaths(input)).toEqual([
      "top",
      "nested.inner",
      "list[1]",
      "list[2].deep",
    ]);
  });
});

describe("assertNoUndefined", () => {
  it("throws and logs when undefined fields are present", () => {
    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    expect(() =>
      assertNoUndefined({ profile: { name: undefined } }, "payload"),
    ).toThrow("Undefined fields in payload: profile.name");

    expect(errorSpy).toHaveBeenCalledWith("❌ Undefined w payload:", [
      "profile.name",
    ]);
  });

  it("does not throw when all values are defined", () => {
    expect(() =>
      assertNoUndefined({ profile: { name: "Anna" } }, "payload"),
    ).not.toThrow();
  });
});
