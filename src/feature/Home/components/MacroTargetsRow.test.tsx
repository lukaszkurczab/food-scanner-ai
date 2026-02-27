import { describe, expect, it, jest } from "@jest/globals";
import { MacroTargetsRow } from "@/feature/Home/components/MacroTargetsRow";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockMacroTargetDonut = jest.fn<
  (props: { macro: "protein" | "fat" | "carbs"; targetGrams: number; consumedGrams: number }) => null
>(() => null);

jest.mock("./MacroTargetDonut", () => ({
  MacroTargetDonut: (props: {
    macro: "protein" | "fat" | "carbs";
    targetGrams: number;
    consumedGrams: number;
  }) => mockMacroTargetDonut(props),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

describe("MacroTargetsRow", () => {
  it("renders nothing when all targets are zero", () => {
    const { toJSON } = renderWithTheme(
      <MacroTargetsRow
        macroTargets={{
          proteinGrams: 0,
          fatGrams: 0,
          carbsGrams: 0,
          proteinKcal: 0,
          fatKcal: 0,
          carbsKcal: 0,
        }}
        consumed={{ protein: 10, fat: 10, carbs: 10 }}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  it("renders macro labels and forwards donut props", () => {
    const { getByText } = renderWithTheme(
      <MacroTargetsRow
        macroTargets={{
          proteinGrams: 150,
          fatGrams: 60,
          carbsGrams: 220,
          proteinKcal: 600,
          fatKcal: 540,
          carbsKcal: 880,
        }}
        consumed={{ protein: 80, fat: 30, carbs: 110 }}
      />,
    );

    expect(getByText("Protein")).toBeTruthy();
    expect(getByText("Fat")).toBeTruthy();
    expect(getByText("Carbs")).toBeTruthy();
    expect(mockMacroTargetDonut).toHaveBeenCalledTimes(3);
    expect(mockMacroTargetDonut).toHaveBeenCalledWith({
      macro: "protein",
      targetGrams: 150,
      consumedGrams: 80,
    });
    expect(mockMacroTargetDonut).toHaveBeenCalledWith({
      macro: "fat",
      targetGrams: 60,
      consumedGrams: 30,
    });
    expect(mockMacroTargetDonut).toHaveBeenCalledWith({
      macro: "carbs",
      targetGrams: 220,
      consumedGrams: 110,
    });
  });
});
