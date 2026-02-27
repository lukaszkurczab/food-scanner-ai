import { describe, expect, it } from "@jest/globals";
import MacroRadarChart from "@/feature/Meals/components/chartLayouts/MacroRadarChart";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("MacroRadarChart", () => {
  it("renders legend rows with rounded values", () => {
    const { getByText } = renderWithTheme(
      <MacroRadarChart
        data={[
          { value: 15.4, color: "#00f", label: "protein" },
          { value: 22.1, color: "#0f0", label: "carbs" },
          { value: 9.7, color: "#f00", label: "fat" },
        ]}
        kcal={410}
      />,
    );

    expect(getByText("410 kcal")).toBeTruthy();
    expect(getByText("protein: 15 g")).toBeTruthy();
    expect(getByText("carbs: 22 g")).toBeTruthy();
    expect(getByText("fat: 10 g")).toBeTruthy();
  });
});
