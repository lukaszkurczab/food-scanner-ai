import { describe, expect, it } from "@jest/globals";
import MacroTagStripCard from "@/feature/Meals/components/cardLayouts/MacroTagStripCard";
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

describe("MacroTagStripCard", () => {
  it("returns null when both toggles are disabled", () => {
    const { queryByText } = renderWithTheme(
      <MacroTagStripCard {...baseProps} showKcal={false} showMacros={false} />,
    );

    expect(queryByText("510 kcal")).toBeNull();
    expect(queryByText("P 30 g")).toBeNull();
  });
});
