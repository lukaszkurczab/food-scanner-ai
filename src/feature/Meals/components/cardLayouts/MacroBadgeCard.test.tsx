import { describe, expect, it, jest } from "@jest/globals";
import MacroBadgeCard from "@/feature/Meals/components/cardLayouts/MacroBadgeCard";
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

describe("MacroBadgeCard", () => {
  it("renders badge label, kcal and macro details", () => {
    const { getByText } = renderWithTheme(<MacroBadgeCard {...baseProps} />);

    expect(getByText("High protein")).toBeTruthy();
    expect(getByText("510 kcal")).toBeTruthy();
    expect(getByText("P 30 g • C 40 g • F 20 g")).toBeTruthy();
  });

  it("renders balanced-macros label when protein share is below threshold", () => {
    const { getByText } = renderWithTheme(
      <MacroBadgeCard
        {...baseProps}
        protein={20}
        carbs={40}
        fat={40}
      />,
    );

    expect(getByText("Balanced macros")).toBeTruthy();
  });
});
