import { describe, expect, it, jest } from "@jest/globals";
import { LineSection } from "@/feature/Statistics/components/LineSection";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockLineGraph = jest.fn<
  (props: {
    data: number[];
    labels: string[];
    stepX: number;
    height: number;
    smooth: boolean;
  }) => null
>(() => null);

jest.mock("@/components", () => ({
  LineGraph: (props: {
    data: number[];
    labels: string[];
    stepX: number;
    height: number;
    smooth: boolean;
  }) => mockLineGraph(props),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("LineSection", () => {
  it("renders metric title and computes line graph step", () => {
    const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon2"];
    const data = [10, 20, 30, 40, 50, 60, 70, 80];
    const { getByText } = renderWithTheme(
      <LineSection labels={labels} data={data} metric="protein" />,
    );

    expect(getByText("statistics:charts.protein")).toBeTruthy();
    expect(mockLineGraph).toHaveBeenCalledWith({
      data,
      labels,
      stepX: 2,
      height: 140,
      smooth: true,
    });
  });
});
