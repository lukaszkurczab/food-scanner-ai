import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ProgressAveragesCard } from "@/feature/Statistics/components/ProgressAveragesCard";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockTargetProgressBar = jest.fn<
  (props: { current: number; target: number }) => null
>(() => null);
jest.mock("@/components", () => ({
  TargetProgressBar: (props: { current: number; target: number }) =>
    mockTargetProgressBar(props),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.kcal != null) return `${key}:${String(params.kcal)}`;
      if (params?.days != null) return `${key}:${String(params.days)}`;
      return key;
    },
  }),
}));

describe("ProgressAveragesCard", () => {
  beforeEach(() => {
    mockTargetProgressBar.mockClear();
  });

  it("renders target progress when daily goal exists", () => {
    renderWithTheme(
      <ProgressAveragesCard
        days={7}
        totalKcal={14000}
        caloriesSeries={[2200, 2000, 1800, 0, 0, 0, 0]}
        dailyGoal={2000}
      />,
    );

    expect(mockTargetProgressBar).toHaveBeenCalledWith({ current: 2000, target: 2000 });
  });

  it("renders fallback total when daily goal is missing", () => {
    const { getByText, queryByText } = renderWithTheme(
      <ProgressAveragesCard
        days={7}
        totalKcal={5600}
        caloriesSeries={[1000, 900, 1200, 1100, 1400]}
        dailyGoal={null}
      />,
    );

    expect(queryByText("2000 of 2000 kcal")).toBeNull();
    expect(getByText("statistics:progress.totalInRange:5600")).toBeTruthy();
    expect(mockTargetProgressBar).not.toHaveBeenCalled();
  });
});
