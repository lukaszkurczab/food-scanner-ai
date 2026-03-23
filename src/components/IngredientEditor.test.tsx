import { Pressable, TextInput as RNTextInput } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { IngredientEditor } from "@/components/IngredientEditor";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: (...args: unknown[]) => mockNavigate(...args),
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string }) =>
      options?.ns ? `${options.ns}:${key}` : key,
  }),
}));

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

describe("IngredientEditor", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("commits parsed ingredient values", () => {
    const onCommit = jest.fn();
    const { UNSAFE_getAllByType, getByText } = renderWithTheme(
      <IngredientEditor
        initial={{
          id: "ing-1",
          name: "Apple",
          amount: 100,
          unit: "g",
          protein: 1,
          carbs: 10,
          fat: 2,
          kcal: 50,
        }}
        onCommit={onCommit}
        onCancel={() => undefined}
        onDelete={() => undefined}
      />,
    );

    const inputs = UNSAFE_getAllByType(RNTextInput);
    fireEvent.changeText(inputs[0], "  Banana  ");
    fireEvent.changeText(inputs[1], "150");
    fireEvent.changeText(inputs[2], "2.5");
    fireEvent.changeText(inputs[3], "30");
    fireEvent.changeText(inputs[4], "0.3");
    fireEvent.changeText(inputs[5], "120");

    fireEvent.press(getByText("common:save_changes"));

    expect(onCommit).toHaveBeenCalledWith({
      id: "ing-1",
      name: "Banana",
      amount: 150,
      unit: "g",
      protein: 2.5,
      carbs: 30,
      fat: 0.3,
      kcal: 120,
    });
  });

  it("does not commit when there are validation errors", () => {
    const onCommit = jest.fn();
    const { getByText } = renderWithTheme(
      <IngredientEditor
        initial={{
          id: "ing-1",
          name: "Apple",
          amount: 100,
          unit: "g",
          protein: 1,
          carbs: 10,
          fat: 2,
          kcal: 50,
        }}
        errors={{ name: "required" }}
        onCommit={onCommit}
        onCancel={() => undefined}
        onDelete={() => undefined}
      />,
    );

    fireEvent.press(getByText("common:save_changes"));
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("navigates to barcode scanner from barcode action", () => {
    const { UNSAFE_getAllByType } = renderWithTheme(
      <IngredientEditor
        initial={{
          id: "ing-1",
          name: "Apple",
          amount: 100,
          unit: "g",
          protein: 1,
          carbs: 10,
          fat: 2,
          kcal: 50,
        }}
        onCommit={() => undefined}
        onCancel={() => undefined}
        onDelete={() => undefined}
      />,
    );

    const pressables = UNSAFE_getAllByType(Pressable);
    fireEvent.press(pressables[0]);

    expect(mockNavigate).toHaveBeenCalledWith("AddMeal", {
      start: "MealCamera",
      barcodeOnly: true,
      returnTo: "Result",
      attempt: 1,
    });
  });
});
