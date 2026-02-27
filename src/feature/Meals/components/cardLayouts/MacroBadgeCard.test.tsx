import { describe, expect, it } from "@jest/globals";
import MacroBadgeCard from "@/feature/Meals/components/cardLayouts/MacroBadgeCard";
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

describe("MacroBadgeCard", () => {
  it("renders badge label, kcal and macro details", () => {
    const { getByText } = renderWithTheme(<MacroBadgeCard {...baseProps} />);

    expect(getByText("High protein")).toBeTruthy();
    expect(getByText("510 kcal")).toBeTruthy();
    expect(getByText("P 30 g • C 40 g • F 20 g")).toBeTruthy();
  });
});
