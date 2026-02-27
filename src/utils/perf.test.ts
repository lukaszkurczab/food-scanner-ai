import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { withTiming } from "@/utils/perf";

describe("withTiming", () => {
  const originalDev = (globalThis as { __DEV__?: boolean }).__DEV__;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  afterEach(() => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = originalDev;
  });

  it("returns function result and logs duration in dev mode", async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1037);

    const result = await withTiming("sync", async () => "ok");

    expect(result).toBe("ok");
    expect(logSpy).toHaveBeenCalledWith("[perf] sync: 37ms");
  });

  it("does not log when dev mode is disabled", async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = false;
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(2000).mockReturnValueOnce(2055);

    await withTiming("sync", async () => "ok");

    expect(logSpy).not.toHaveBeenCalled();
  });

  it("logs timing and rethrows when wrapped promise rejects", async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(3000).mockReturnValueOnce(3012);

    await expect(
      withTiming("failing-sync", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(logSpy).toHaveBeenCalledWith("[perf] failing-sync: 12ms");
  });
});
