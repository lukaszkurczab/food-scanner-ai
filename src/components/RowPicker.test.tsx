import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { RowPicker } from "@/components/RowPicker";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("RowPicker", () => {
  it("renders selected option and updates when a different option is pressed", () => {
    const onChange = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <RowPicker
        label="Units"
        value="metric"
        options={[
          { label: "Metric", value: "metric" },
          { label: "Imperial", value: "imperial" },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.press(getByLabelText("Imperial"));
    expect(onChange).toHaveBeenCalledWith("imperial");
  });

  it("renders an error message when provided", () => {
    const { getByText } = renderWithTheme(
      <RowPicker
        label="Goal"
        value="maintain"
        options={[
          { label: "Lose", value: "lose" },
          { label: "Maintain", value: "maintain" },
          { label: "Gain", value: "increase" },
        ]}
        onChange={() => undefined}
        error="required"
      />,
    );

    expect(getByText("required")).toBeTruthy();
  });
});
