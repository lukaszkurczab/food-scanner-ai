import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { RangeTabs } from "@/feature/Statistics/components/RangeTabs";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("RangeTabs", () => {
  it("renders options and calls onChange with selected key", () => {
    const onChange = jest.fn();
    const { getByText } = renderWithTheme(
      <RangeTabs
        options={[
          { key: "7d", label: "7D" },
          { key: "30d", label: "30D" },
        ]}
        active="7d"
        onChange={onChange}
      />,
    );

    fireEvent.press(getByText("30D"));
    expect(onChange).toHaveBeenCalledWith("30d");
  });
});
