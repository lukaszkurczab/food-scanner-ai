import { describe, expect, it } from "@jest/globals";
import MacroBarMini from "@/feature/Meals/components/chartLayouts/MacroBarMini";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("MacroBarMini", () => {
  it("renders macro labels and can hide kcal label", () => {
    const { getByText, queryByText } = renderWithTheme(
      <MacroBarMini
        protein={12}
        carbs={40}
        fat={18}
        kcal={500}
        showKcalLabel={false}
      />,
    );

    expect(queryByText("500 kcal")).toBeNull();
    expect(getByText("P")).toBeTruthy();
    expect(getByText("C")).toBeTruthy();
    expect(getByText("F")).toBeTruthy();
  });
});
