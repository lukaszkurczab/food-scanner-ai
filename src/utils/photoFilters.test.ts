import { describe, expect, it } from "@jest/globals";
import { cycleFilter, getFilterOverlay } from "@/utils/photoFilters";

describe("cycleFilter", () => {
  it("cycles right and wraps around", () => {
    expect(cycleFilter("none", "right")).toBe("bw");
    expect(cycleFilter("warm", "right")).toBe("none");
  });

  it("cycles left and wraps around", () => {
    expect(cycleFilter("none", "left")).toBe("warm");
    expect(cycleFilter("sepia", "left")).toBe("bw");
  });

  it("returns none for unknown current filter value", () => {
    expect(cycleFilter("invalid" as never, "right")).toBe("none");
  });
});

describe("getFilterOverlay", () => {
  it("returns expected overlays for known filters", () => {
    expect(getFilterOverlay("bw")).toEqual({
      overlayStyle: { backgroundColor: "rgba(0,0,0,0.28)" },
    });
    expect(getFilterOverlay("sepia")).toEqual({
      overlayStyle: { backgroundColor: "rgba(112,66,20,0.22)" },
    });
    expect(getFilterOverlay("cool")).toEqual({
      overlayStyle: { backgroundColor: "rgba(40,120,255,0.18)" },
    });
    expect(getFilterOverlay("warm")).toEqual({
      overlayStyle: { backgroundColor: "rgba(255,140,0,0.18)" },
    });
  });

  it("returns empty object for none filter", () => {
    expect(getFilterOverlay("none")).toEqual({});
  });
});
