import { describe, expect, it } from "@jest/globals";
import MacroPolarAreaChart from "@/feature/Meals/components/chartLayouts/MacroPolarAreaChart";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("MacroPolarAreaChart", () => {
  it("renders fallback kcal when data is empty", () => {
    const { getByText } = renderWithTheme(
      <MacroPolarAreaChart data={[]} kcal={275} />,
    );

    expect(getByText("275 kcal")).toBeTruthy();
  });
});
