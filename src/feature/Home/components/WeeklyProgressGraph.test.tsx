import { describe, expect, it, jest } from "@jest/globals";
import { WeeklyProgressGraph } from "@/feature/Home/components/WeeklyProgressGraph";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockLineGraph = jest.fn<
  (props: { data: number[]; labels: string[]; stepX: number }) => null
>(() => null);

jest.mock("@/components", () => ({
  LineGraph: (props: { data: number[]; labels: string[]; stepX: number }) =>
    mockLineGraph(props),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("WeeklyProgressGraph", () => {
  it("renders title and passes data to line graph", () => {
    const data = [1800, 1900, 2000];
    const labels = ["Mon", "Tue", "Wed"];
    const { getByText } = renderWithTheme(
      <WeeklyProgressGraph data={data} labels={labels} />,
    );

    expect(getByText("translated:weeklyProgress")).toBeTruthy();
    expect(mockLineGraph).toHaveBeenCalledWith({
      data,
      labels,
      stepX: 1,
    });
  });
});
