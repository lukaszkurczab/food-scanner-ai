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
    expect(getByText("Today's meal")).toBeTruthy();
    expect(getByText("Protein 30 g")).toBeTruthy();
    expect(getByText("Carbs 40 g")).toBeTruthy();
    expect(getByText("Fat 20 g")).toBeTruthy();
  });
});
