import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Checkbox } from "@/components/Checkbox";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockFeather = () => null;
jest.mock("@expo/vector-icons", () => ({
  Feather: mockFeather,
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
});
