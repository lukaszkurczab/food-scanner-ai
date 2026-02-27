import { describe, expect, it } from "@jest/globals";
import MacroSummaryCard from "@/feature/Meals/components/cardLayouts/MacroSummaryCard";
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

describe("MacroSummaryCard", () => {
  it("hides macro row when showMacros is false", () => {
    const { getByText, queryByText } = renderWithTheme(
      <MacroSummaryCard {...baseProps} showMacros={false} />,
    );

    expect(getByText("510 kcal")).toBeTruthy();
    expect(queryByText("P 30 g • C 40 g • F 20 g")).toBeNull();
  });
});
