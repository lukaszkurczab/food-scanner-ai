import { describe, expect, it, jest } from "@jest/globals";
import MacroSplitCard from "@/feature/Meals/components/cardLayouts/MacroSplitCard";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { MacroCardProps } from "@/feature/Meals/components/CardOverlay";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          "share:cardLabels.meal_summary": "Meal summary",
          "share:cardLabels.balanced_macros": "Balanced macros",
          "share:cardLabels.high_protein": "High protein",
          "meals:protein_short": "P",
          "meals:carbs_short": "C",
          "meals:fat_short": "F",
          "meals:protein": "Protein",
          "meals:carbs": "Carbs",
          "meals:fat": "Fat",
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

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

  it("renders nothing when both kcal and macros are hidden", () => {
    const { toJSON } = renderWithTheme(
      <MacroSplitCard {...baseProps} showKcal={false} showMacros={false} />,
    );

    expect(toJSON()).toBeNull();
  });
});
