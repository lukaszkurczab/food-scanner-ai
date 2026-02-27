import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { autoMealName } from "@/utils/autoMealName";

describe("autoMealName", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns breakfast for morning hours", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(6);
    expect(autoMealName()).toBe("Breakfast");
  });

  it("returns lunch for midday hours", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(12);
    expect(autoMealName()).toBe("Lunch");
  });

  it("returns dinner for afternoon hours", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(17);
    expect(autoMealName()).toBe("Dinner");
  });

  it("returns snack for night hours", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(2);
    expect(autoMealName()).toBe("Snack");
  });

  it("uses explicit meal type over auto-detected value", () => {
    jest.spyOn(Date.prototype, "getHours").mockReturnValue(2);
    expect(autoMealName("lunch")).toBe("Lunch");
  });
});
