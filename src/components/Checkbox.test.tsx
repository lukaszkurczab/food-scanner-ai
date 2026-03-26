import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { StyleSheet } from "react-native";
import { Checkbox } from "@/components/Checkbox";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import { themes } from "@/theme/themes";

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

describe("Checkbox", () => {
  it("toggles checked value on press", () => {
    const onChange = jest.fn();
    const { getByRole } = renderWithTheme(
      <Checkbox checked={false} onChange={onChange} />,
    );

    fireEvent.press(getByRole("checkbox"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("does not toggle while disabled", () => {
    const onChange = jest.fn();
    const { getByRole } = renderWithTheme(
      <Checkbox checked={false} onChange={onChange} disabled />,
    );

    fireEvent.press(getByRole("checkbox"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("uses the updated checkbox dimensions and disabled state colors", () => {
    const { getByRole } = renderWithTheme(
      <Checkbox checked onChange={() => undefined} disabled />,
    );

    expect(StyleSheet.flatten(getByRole("checkbox").props.style)).toEqual(
      expect.objectContaining({
        width: 24,
        height: 24,
        borderWidth: 2,
        backgroundColor: themes.light.disabled.background,
      }),
    );
  });
});
