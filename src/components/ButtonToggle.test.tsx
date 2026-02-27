import { Animated } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { ButtonToggle } from "@/components/ButtonToggle";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("ButtonToggle", () => {
  beforeEach(() => {
    jest.spyOn(Animated, "timing").mockReturnValue({
      start: () => undefined,
      stop: () => undefined,
      reset: () => undefined,
    } as unknown as Animated.CompositeAnimation);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("toggles from false to true", () => {
    const onToggle = jest.fn();
    const { getByRole } = renderWithTheme(
      <ButtonToggle value={false} onToggle={onToggle} />,
    );

    fireEvent.press(getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("toggles from true to false", () => {
    const onToggle = jest.fn();
    const { getByRole } = renderWithTheme(
      <ButtonToggle value onToggle={onToggle} />,
    );

    fireEvent.press(getByRole("switch"));
    expect(onToggle).toHaveBeenCalledWith(false);
  });
});
