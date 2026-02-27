import { describe, expect, it } from "@jest/globals";
import DonutMacroChart from "@/feature/Meals/components/chartLayouts/DonutMacroChart";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("DonutMacroChart", () => {
  it("renders fallback kcal label for empty dataset", () => {
    const { getByText } = renderWithTheme(
      <DonutMacroChart data={[]} kcal={420} />,
    );

    expect(getByText("420 kcal")).toBeTruthy();
  });
});
