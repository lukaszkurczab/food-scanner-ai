import { act, renderHook } from "@testing-library/react-native";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

describe("useDebouncedValue", () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("returns initial value immediately and updates after debounce delay", () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay?: number }) =>
        useDebouncedValue(value, delay),
      { initialProps: { value: "first", delay: 200 } },
    );

    expect(result.current).toBe("first");

    rerender({ value: "second", delay: 200 });
    expect(result.current).toBe("first");

    act(() => {
      jest.advanceTimersByTime(199);
    });
    expect(result.current).toBe("first");

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe("second");
  });

  it("cancels previous timer when value changes quickly", () => {
    jest.useFakeTimers();
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebouncedValue(value),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    rerender({ value: "c" });

    act(() => {
      jest.advanceTimersByTime(220);
    });

    expect(result.current).toBe("c");
  });
});
