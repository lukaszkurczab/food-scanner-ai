import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import MacroPieChart from "@/feature/Meals/components/chartLayouts/MacroPieChart";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type PieChartProps = {
  data: Array<{ value: number; color: string; label: string }>;
  maxSize: number;
  minSize: number;
  legendWidth: number;
  gap: number;
  fontSize: number;
};

const mockPieChart = jest.fn<(props: PieChartProps) => null>(() => null);

jest.mock("@/components/PieChart", () => ({
  PieChart: (props: PieChartProps) => mockPieChart(props),
}));

describe("MacroPieChart", () => {
  beforeEach(() => {
    mockPieChart.mockClear();
  });

  it("normalizes negative values before forwarding data to PieChart", () => {
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
    expect(mockPieChart).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { value: 0, color: "#00f", label: "protein" },
          { value: 20, color: "#0f0", label: "carbs" },
          { value: 10, color: "#f00", label: "fat" },
        ],
      }),
    );
  });
});
