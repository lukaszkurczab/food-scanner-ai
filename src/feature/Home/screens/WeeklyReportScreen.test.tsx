import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import WeeklyReportScreen from "@/feature/Home/screens/WeeklyReportScreen";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockUseAuthContext = jest.fn();
const mockUseWeeklyReport = jest.fn();

jest.mock("@/context/AuthContext", () => ({
  useAuthContext: () => mockUseAuthContext(),
}));

jest.mock("@/hooks/useWeeklyReport", () => ({
  useWeeklyReport: (params: unknown) => mockUseWeeklyReport(params),
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text, View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Layout: ({ children }: { children?: ReactNode }) =>
      createElement(View, null, children),
    BackTitleHeader: ({
      title,
      onBack,
    }: {
      title: string;
      onBack: () => void;
    }) =>
      createElement(
        View,
        null,
        createElement(Text, null, title),
        createElement(
          Pressable,
          { onPress: onBack },
          createElement(Text, null, "back"),
        ),
      ),
  };
});

describe("WeeklyReportScreen", () => {
  beforeEach(() => {
    mockUseAuthContext.mockReturnValue({ uid: "user-1" });
  });

  it("renders loading state", () => {
    mockUseWeeklyReport.mockReturnValue({
      report: {
        status: "not_available",
        period: { startDay: "2026-03-09", endDay: "2026-03-15" },
        summary: null,
        insights: [],
        priorities: [],
      },
      loading: true,
      enabled: true,
      source: "fallback",
      status: "service_unavailable",
      error: null,
      refresh: jest.fn(),
    });

    const navigation = { goBack: jest.fn() };
    const { getByText } = renderWithTheme(
      <WeeklyReportScreen navigation={navigation as never} />,
    );

    expect(getByText("Loading weekly report")).toBeTruthy();
    expect(getByText("Checking the latest closed week.")).toBeTruthy();
  });

  it("renders ready state", () => {
    mockUseWeeklyReport.mockReturnValue({
      report: {
        status: "ready",
        period: { startDay: "2026-03-09", endDay: "2026-03-15" },
        summary: "Logging stayed steady across the week.",
        insights: [
          {
            type: "consistency",
            importance: "high",
            tone: "positive",
            title: "You stayed consistent on most days",
            body: "You had valid logging on 6 of 7 days, which made the week readable.",
            reasonCodes: ["valid_logged_days_7_high"],
          },
        ],
        priorities: [
          {
            type: "maintain_consistency",
            text: "Keep the same logging rhythm on most days.",
            reasonCodes: ["maintain_best_pattern"],
          },
        ],
      },
      loading: false,
      enabled: true,
      source: "remote",
      status: "live_success",
      error: null,
      refresh: jest.fn(),
    });

    const navigation = { goBack: jest.fn() };
    const { getByText } = renderWithTheme(
      <WeeklyReportScreen navigation={navigation as never} />,
    );

    expect(getByText("Weekly report")).toBeTruthy();
    expect(getByText("What mattered most")).toBeTruthy();
    expect(getByText("You stayed consistent on most days")).toBeTruthy();
    expect(getByText("Next week priorities")).toBeTruthy();
  });

  it("renders insufficient-data state", () => {
    mockUseWeeklyReport.mockReturnValue({
      report: {
        status: "insufficient_data",
        period: { startDay: "2026-03-09", endDay: "2026-03-15" },
        summary: "Log a few complete days to unlock a weekly report.",
        insights: [],
        priorities: [],
      },
      loading: false,
      enabled: true,
      source: "remote",
      status: "live_success",
      error: null,
      refresh: jest.fn(),
    });

    const navigation = { goBack: jest.fn() };
    const { getByText } = renderWithTheme(
      <WeeklyReportScreen navigation={navigation as never} />,
    );

    expect(getByText("Not enough data yet")).toBeTruthy();
    expect(
      getByText("Log a few more complete days and this weekly report will unlock."),
    ).toBeTruthy();
  });

  it("renders unavailable state", () => {
    mockUseWeeklyReport.mockReturnValue({
      report: {
        status: "not_available",
        period: { startDay: "2026-03-09", endDay: "2026-03-15" },
        summary: null,
        insights: [],
        priorities: [],
      },
      loading: false,
      enabled: true,
      source: "fallback",
      status: "service_unavailable",
      error: new Error("backend down"),
      refresh: jest.fn(),
    });

    const navigation = { goBack: jest.fn() };
    const { getByText } = renderWithTheme(
      <WeeklyReportScreen navigation={navigation as never} />,
    );

    expect(getByText("Weekly report unavailable")).toBeTruthy();
    expect(
      getByText("This surface is not ready right now. Try again later."),
    ).toBeTruthy();
  });
});
