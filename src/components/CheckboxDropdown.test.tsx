import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { CheckboxDropdown } from "@/components/CheckboxDropdown";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("CheckboxDropdown", () => {
  it("renders selected values and respects disabled state", () => {
    const onChange = jest.fn();
    const { getByLabelText, getByText } = renderWithTheme(
      <CheckboxDropdown
        label="Preferences"
        options={[
          { label: "Keto", value: "keto" },
          { label: "Vegan", value: "vegan" },
        ]}
        values={["keto"]}
        onChange={onChange}
        disabled
      />,
    );

    expect(getByText("Keto")).toBeTruthy();

    fireEvent.press(getByLabelText("Preferences"));
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders placeholder when no values are selected", () => {
    const { getByText } = renderWithTheme(
      <CheckboxDropdown
        label="Preferences"
        options={[{ label: "Keto", value: "keto" }]}
        values={[]}
        onChange={() => undefined}
      />,
    );

    expect(getByText("none")).toBeTruthy();
  });
});
