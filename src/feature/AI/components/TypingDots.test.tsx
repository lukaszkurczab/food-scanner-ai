import { Animated } from "react-native";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { TypingDots } from "@/feature/AI/components/TypingDots";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockIsE2EModeEnabled = jest.fn(() => false);
jest.mock("@/services/e2e/config", () => ({
  isE2EModeEnabled: () => mockIsE2EModeEnabled(),
}));

describe("TypingDots", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsE2EModeEnabled.mockReturnValue(false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns null in e2e mode", () => {
    mockIsE2EModeEnabled.mockReturnValue(true);
    const { toJSON } = renderWithTheme(<TypingDots />);

    expect(toJSON()).toBeNull();
  });

  it("renders and starts looped animation outside e2e mode", () => {
    const start = jest.fn();
    const composite = {
      start,
    } as unknown as Animated.CompositeAnimation;
    const loopSpy = jest.spyOn(Animated, "loop").mockReturnValue(composite);
    const sequenceSpy = jest
      .spyOn(Animated, "sequence")
      .mockReturnValue(composite);
    const timingSpy = jest.spyOn(Animated, "timing").mockReturnValue(composite);
    const { toJSON } = renderWithTheme(<TypingDots />);

    expect(toJSON()).toBeTruthy();
    expect(loopSpy).toHaveBeenCalledTimes(3);
    expect(sequenceSpy).toHaveBeenCalledTimes(3);
    expect(timingSpy).toHaveBeenCalledTimes(6);
    expect(start).toHaveBeenCalledTimes(3);
  });
});
