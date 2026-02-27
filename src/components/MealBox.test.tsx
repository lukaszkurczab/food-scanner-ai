import { Pressable, Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { MealBox } from "@/components/MealBox";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

type DropdownProps = {
  onChange: (value: "breakfast" | "lunch" | "dinner" | "snack" | "other" | null) => void;
};

const mockDropdown = jest.fn((props: DropdownProps) => (
  <Pressable testID="meal-type-dropdown" onPress={() => props.onChange("dinner")}>
    <Text>mock-dropdown</Text>
  </Pressable>
));

const mockPieChart = jest.fn(() => null);

jest.mock("@/components/Dropdown", () => ({
  Dropdown: (props: DropdownProps) => mockDropdown(props),
}));

jest.mock("@/components/PieChart", () => ({
  PieChart: () => mockPieChart(),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string }) =>
      key.includes(":") ? key : options?.ns ? `${options.ns}:${key}` : key,
  }),
}));

describe("MealBox", () => {
  beforeEach(() => {
    mockDropdown.mockClear();
    mockPieChart.mockClear();
  });

  it("renders readonly meal details", () => {
    const { getByText } = renderWithTheme(
      <MealBox
        name="Chicken bowl"
        type="lunch"
        nutrition={{ kcal: 560, protein: 40, carbs: 50, fat: 18 }}
      />,
    );

    expect(getByText("Chicken bowl")).toBeTruthy();
    expect(getByText("meals:lunch")).toBeTruthy();
    expect(mockPieChart).toHaveBeenCalledTimes(1);
  });

  it("supports editing name and type", () => {
    const onNameChange = jest.fn();
    const onTypeChange = jest.fn();
    const { getByPlaceholderText, getByTestId } = renderWithTheme(
      <MealBox
        name="Initial"
        type="breakfast"
        nutrition={{ kcal: 100, protein: 10, carbs: 10, fat: 2 }}
        editable
        onNameChange={onNameChange}
        onTypeChange={onTypeChange}
      />,
    );

    fireEvent.changeText(
      getByPlaceholderText("meals:ingredient_name"),
      "Updated name",
    );
    fireEvent.press(getByTestId("meal-type-dropdown"));

    expect(onNameChange).toHaveBeenCalledWith("Updated name");
    expect(onTypeChange).toHaveBeenCalledWith("dinner");
  });

  it("does not render pie chart when all macro values are zero", () => {
    renderWithTheme(
      <MealBox
        name="Zero macros"
        type="snack"
        nutrition={{ kcal: 0, protein: 0, carbs: 0, fat: 0 }}
      />,
    );

    expect(mockPieChart).not.toHaveBeenCalled();
  });
});
