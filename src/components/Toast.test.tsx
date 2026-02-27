import { Animated } from "react-native";
import { act } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Toast, ToastContainer } from "@/components/Toast";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("Toast", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("triggers show and hide animations when toast is emitted", () => {
    const timingStart = jest.fn();
    const parallelStart = jest.fn();

    jest
      .spyOn(Animated, "timing")
      .mockReturnValue({ start: timingStart } as unknown as Animated.CompositeAnimation);
    const parallelSpy = jest
      .spyOn(Animated, "parallel")
      .mockReturnValue({ start: parallelStart } as unknown as Animated.CompositeAnimation);

    renderWithTheme(<ToastContainer />);

    act(() => {
      Toast.show("Saved");
    });

    expect(parallelSpy).toHaveBeenCalledTimes(1);
    expect(timingStart).toHaveBeenCalledTimes(0);
    expect(parallelStart).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(2500);
    });

    expect(parallelSpy).toHaveBeenCalledTimes(2);
    expect(parallelStart).toHaveBeenCalledTimes(2);
  });

  it("is safe to call Toast.show without mounted container", () => {
    const parallelSpy = jest.spyOn(Animated, "parallel");

    act(() => {
      Toast.show("No container");
    });

    expect(parallelSpy).not.toHaveBeenCalled();
  });
});
