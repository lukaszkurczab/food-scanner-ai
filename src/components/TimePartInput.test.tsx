import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { TimePartInput } from "@/components/TimePartInput";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("TimePartInput", () => {
  it("accepts only digits and max two characters", () => {
    const onChangeText = jest.fn();
    const { getByDisplayValue } = renderWithTheme(
      <TimePartInput
        value="01"
        onChangeText={onChangeText}
        onCommit={() => undefined}
        min={0}
        max={59}
        fallbackValue={10}
      />,
    );

    fireEvent.changeText(getByDisplayValue("01"), "a9b123");
    expect(onChangeText).toHaveBeenCalledWith("91");
  });

  it("commits clamped value on blur", () => {
    const onChangeText = jest.fn();
    const onCommit = jest.fn();
    const { getByDisplayValue } = renderWithTheme(
      <TimePartInput
        value="88"
        onChangeText={onChangeText}
        onCommit={onCommit}
        min={0}
        max={59}
        fallbackValue={10}
      />,
    );

    fireEvent(getByDisplayValue("88"), "blur");
    expect(onCommit).toHaveBeenCalledWith(59);
    expect(onChangeText).toHaveBeenCalledWith("59");
  });

  it("maps zero to max when configured", () => {
    const onChangeText = jest.fn();
    const onCommit = jest.fn();
    const { getByDisplayValue } = renderWithTheme(
      <TimePartInput
        value="00"
        onChangeText={onChangeText}
        onCommit={onCommit}
        min={1}
        max={12}
        fallbackValue={7}
        mapZeroToMax
      />,
    );

    fireEvent(getByDisplayValue("00"), "blur");
    expect(onCommit).toHaveBeenCalledWith(12);
    expect(onChangeText).toHaveBeenCalledWith("12");
  });

  it("uses fallback for invalid input", () => {
    const onChangeText = jest.fn();
    const onCommit = jest.fn();
    const { getByDisplayValue } = renderWithTheme(
      <TimePartInput
        value=""
        onChangeText={onChangeText}
        onCommit={onCommit}
        min={0}
        max={59}
        fallbackValue={9}
      />,
    );

    fireEvent(getByDisplayValue(""), "blur");
    expect(onCommit).not.toHaveBeenCalled();
    expect(onChangeText).toHaveBeenCalledWith("09");
  });
});
