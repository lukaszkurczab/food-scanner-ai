import { describe, expect, it } from "@jest/globals";
import MacroSplitCard from "@/feature/Meals/components/cardLayouts/MacroSplitCard";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { MacroCardProps } from "@/feature/Meals/components/CardOverlay";

const baseProps: MacroCardProps = {
  protein: 30,
  carbs: 40,
  fat: 20,
  kcal: 510,
  textColor: "#111111",
  bgColor: "#eeeeee",
  macroColors: {
    protein: "#00f",
    carbs: "#0f0",
    fat: "#f00",
  },
  showKcal: true,
  showMacros: true,
};

describe("MacroSplitCard", () => {
  it("renders split rows and kcal", () => {
    const { getByText } = renderWithTheme(<MacroSplitCard {...baseProps} />);

    expect(getByText("510 kcal")).toBeTruthy();
    expect(getByText("Meal summary")).toBeTruthy();
    expect(getByText("P")).toBeTruthy();
    expect(getByText("C")).toBeTruthy();
    expect(getByText("F")).toBeTruthy();
    expect(getByText("30g")).toBeTruthy();
    expect(getByText("40g")).toBeTruthy();
    expect(getByText("20g")).toBeTruthy();
  });
});
