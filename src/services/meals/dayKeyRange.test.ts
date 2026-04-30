import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals";

const ORIGINAL_TZ = process.env.TZ;

describe("dayKeyRange DST handling", () => {
  beforeAll(() => {
    process.env.TZ = "Europe/Warsaw";
    jest.resetModules();
  });

  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
    jest.resetModules();
  });

  it("enumerates all canonical dayKeys across the DST transition", () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { enumerateDayKeys } = require("@/services/meals/dayKeyRange") as typeof import("@/services/meals/dayKeyRange");

      expect(
        enumerateDayKeys({
          startDayKey: "2026-03-28",
          endDayKey: "2026-03-30",
        }),
      ).toEqual(["2026-03-28", "2026-03-29", "2026-03-30"]);
    });
  });

  it("keeps Statistics custom ranges inclusive across the DST transition", () => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { buildStatisticsRangeState } = require("@/feature/Statistics/services/statisticsRangeSelectors") as typeof import("@/feature/Statistics/services/statisticsRangeSelectors");

      const state = buildStatisticsRangeState({
        meals: [],
        activeRange: "custom",
        todayDayKey: "2026-03-30",
        customRange: {
          startDayKey: "2026-03-28",
          endDayKey: "2026-03-30",
        },
      });

      expect(state.dayKeys).toEqual([
        "2026-03-28",
        "2026-03-29",
        "2026-03-30",
      ]);
      expect(state.dayKeys).toHaveLength(3);
    });
  });
});
