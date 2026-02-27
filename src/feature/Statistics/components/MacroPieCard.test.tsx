import { describe, expect, it, jest } from "@jest/globals";
import { MacroPieCard } from "@/feature/Statistics/components/MacroPieCard";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockPieChart = jest.fn<
  (props: {
    data: Array<{ value: number; color: string; label: string }>;
    maxSize: number;
    minSize: number;
    legendWidth: number;
  }) => null
>(() => null);

jest.mock("@/components", () => ({
  PieChart: (props: {
    data: Array<{ value: number; color: string; label: string }>;
    maxSize: number;
    minSize: number;
    legendWidth: number;
  }) => mockPieChart(props),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("MacroPieCard", () => {
  it("renders translated title and passes macro data to pie chart", () => {
    const { getByText } = renderWithTheme(
      <MacroPieCard protein={90} carbs={220} fat={70} />,
    );

    expect(getByText("statistics:charts.macroBreakdown")).toBeTruthy();
    expect(mockPieChart).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ value: 90, label: "Protein" }),
        expect.objectContaining({ value: 70, label: "Fat" }),
        expect.objectContaining({ value: 220, label: "Carbs" }),
      ]),
      maxSize: 160,
      minSize: 140,
      legendWidth: 140,
    });
  });
});
