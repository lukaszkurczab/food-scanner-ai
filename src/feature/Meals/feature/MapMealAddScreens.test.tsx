import { describe, expect, it, jest } from "@jest/globals";

jest.mock("../screens/MealAdd/MealCameraScreen", () => ({
  __esModule: true,
  default: function MockMealCameraScreen() {
    return null;
  },
}));

jest.mock("../screens/MealAdd/BarcodeProductNotFoundScreen", () => ({
  __esModule: true,
  default: function MockBarcodeProductNotFoundScreen() {
    return null;
  },
}));

jest.mock("../screens/MealAdd/IngredientsNotRecognizedScreen", () => ({
  __esModule: true,
  default: function MockIngredientsNotRecognizedScreen() {
    return null;
  },
}));

jest.mock("../screens/MealAdd/ResultScreen", () => ({
  __esModule: true,
  default: function MockResultScreen() {
    return null;
  },
}));

import MealCameraScreen from "../screens/MealAdd/MealCameraScreen";
import BarcodeProductNotFoundScreen from "../screens/MealAdd/BarcodeProductNotFoundScreen";
import IngredientsNotRecognizedScreen from "../screens/MealAdd/IngredientsNotRecognizedScreen";
import ResultScreen from "../screens/MealAdd/ResultScreen";
import MapMealAddScreens from "./MapMealAddScreens";

describe("MapMealAddScreens", () => {
  it("returns the correct screen component for each flow step", () => {
    expect(MapMealAddScreens("MealCamera")).toBe(MealCameraScreen);
    expect(MapMealAddScreens("BarcodeProductNotFound")).toBe(
      BarcodeProductNotFoundScreen,
    );
    expect(MapMealAddScreens("IngredientsNotRecognized")).toBe(
      IngredientsNotRecognizedScreen,
    );
    expect(MapMealAddScreens("Result")).toBe(ResultScreen);
  });

  it("throws for an unsupported flow step", () => {
    expect(() =>
      MapMealAddScreens("UnknownScreen" as never),
    ).toThrow("Unknown screen: UnknownScreen");
  });
});
