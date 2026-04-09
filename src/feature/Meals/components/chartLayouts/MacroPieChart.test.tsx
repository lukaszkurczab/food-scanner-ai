import { describe, expect, it } from "@jest/globals";
import MacroPieChart from "@/feature/Meals/components/chartLayouts/MacroPieChart";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("MacroPieChart", () => {
  it("normalizes negative values and renders compact legend shares", () => {
    const { getByText } = renderWithTheme(
      <MacroPieChart
        data={[
          { value: -5, color: "#00f", label: "protein" },
          { value: 20, color: "#0f0", label: "carbs" },
          { value: 10, color: "#f00", label: "fat" },
        ]}
        kcal={320}
      />,
    );

    expect(getByText("320 kcal")).toBeTruthy();
    expect(getByText("P")).toBeTruthy();
    expect(getByText("C")).toBeTruthy();
    expect(getByText("F")).toBeTruthy();
    expect(getByText("0%")).toBeTruthy();
    expect(getByText("67%")).toBeTruthy();
    expect(getByText("33%")).toBeTruthy();
  });
});

