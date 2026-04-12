import { act, renderHook, waitFor } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createFallbackWeeklyReport } from "@/services/weeklyReport/weeklyReportService";
import type { WeeklyReportResult } from "@/services/weeklyReport/weeklyReportTypes";
import { useWeeklyReport } from "@/hooks/useWeeklyReport";

const mockGetWeeklyReport = jest.fn<
  (uid: string | null | undefined, options?: { weekEnd?: string | null }) => Promise<WeeklyReportResult>
>();

jest.mock("@/services/weeklyReport/weeklyReportService", () => {
  const actual =
    jest.requireActual(
      "@/services/weeklyReport/weeklyReportService",
    ) as typeof import("@/services/weeklyReport/weeklyReportService");
  return {
    ...actual,
    getWeeklyReport: (
      uid: string | null | undefined,
      options?: { weekEnd?: string | null },
    ) => mockGetWeeklyReport(uid, options),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

describe("useWeeklyReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("ignores stale weekly report loads after week changes", async () => {
    const firstReport = createFallbackWeeklyReport("2026-03-15");
    firstReport.summary = "Stale summary";

    const secondReport = createFallbackWeeklyReport("2026-03-22");
    secondReport.summary = "Fresh summary";

    const firstRequest = deferred<WeeklyReportResult>();
    const secondRequest = deferred<WeeklyReportResult>();
    mockGetWeeklyReport
      .mockReturnValueOnce(firstRequest.promise)
      .mockReturnValueOnce(secondRequest.promise);

    const { result, rerender } = renderHook(
      ({ weekEnd }: { weekEnd: string }) =>
        useWeeklyReport({
          uid: "user-1",
          weekEnd,
        }),
      {
        initialProps: { weekEnd: "2026-03-15" },
      },
    );

    rerender({ weekEnd: "2026-03-22" });

    await act(async () => {
      secondRequest.resolve({
        report: secondReport,
        source: "remote",
        status: "live_success",
        enabled: true,
        error: null,
      });
      await secondRequest.promise;
    });

    await waitFor(() => {
      expect(result.current.report.period.endDay).toBe("2026-03-22");
      expect(result.current.report.summary).toBe("Fresh summary");
    });

    await act(async () => {
      firstRequest.resolve({
        report: firstReport,
        source: "remote",
        status: "live_success",
        enabled: true,
        error: null,
      });
      await firstRequest.promise;
    });

    expect(result.current.report.period.endDay).toBe("2026-03-22");
    expect(result.current.report.summary).toBe("Fresh summary");
  });
});
