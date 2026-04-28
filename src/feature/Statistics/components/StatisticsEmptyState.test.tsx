import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StatisticsEmptyState } from "@/feature/Statistics/components/StatisticsEmptyState";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (
      key: string,
      options?: { days?: number },
    ) =>
      typeof options?.days === "number" ? `${key}:${options.days}` : key,
  }),
}));

describe("StatisticsEmptyState", () => {
  it("uses the offline copy only for no_history", () => {
    const offlineNoHistory = renderWithTheme(
      <StatisticsEmptyState kind="no_history" isOffline />,
    );
    expect(offlineNoHistory.getByText("statistics:offlineEmpty.title")).toBeTruthy();
    offlineNoHistory.unmount();

    const offlineRangeEmpty = renderWithTheme(
      <StatisticsEmptyState kind="no_entries_in_range" isOffline />,
    );
    expect(offlineRangeEmpty.getByText("statistics:emptyRange.title")).toBeTruthy();
    expect(
      offlineRangeEmpty.queryByText("statistics:offlineEmpty.title"),
    ).toBeNull();
  });

  it("renders a manage-subscription CTA for free-window limitations", () => {
    const onManageSubscription = jest.fn();
    const { getByText } = renderWithTheme(
      <StatisticsEmptyState
        kind="limited_by_free_window"
        isOffline={false}
        accessWindowDays={30}
        onManageSubscription={onManageSubscription}
      />,
    );

    expect(getByText("statistics:limitedRange.desc:30")).toBeTruthy();
    fireEvent.press(getByText("statistics:limitedRange.cta"));
    expect(onManageSubscription).toHaveBeenCalled();
  });
});
