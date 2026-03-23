import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Dropdown } from "@/components/Dropdown";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

describe("Dropdown", () => {
  it("renders selected value and respects disabled state", () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = renderWithTheme(
      <Dropdown
        label="Units"
        value="metric"
        options={[
          { label: "Metric", value: "metric" },
          { label: "Imperial", value: "imperial" },
        ]}
        onChange={onChange}
        disabled
      />,
    );

    expect(getByText("Metric")).toBeTruthy();

    fireEvent.press(getByLabelText("Units"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders error text", () => {
    const { getByText } = renderWithTheme(
      <Dropdown
        label="Units"
        value={null}
        options={[{ label: "Metric", value: "metric" }]}
        onChange={() => undefined}
        error="field-required"
      />,
    );

    expect(getByText("field-required")).toBeTruthy();
  });
});
