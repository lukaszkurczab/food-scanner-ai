import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { IngredientBox } from "@/components/IngredientBox";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockIngredientEditor = jest.fn();

jest.mock("./IngredientEditor", () => ({
  IngredientEditor: (props: {
    onCommit: (ingredient: {
      id: string;
      name: string;
      amount: number;
      unit?: "g" | "ml";
      protein: number;
      carbs: number;
      fat: number;
      kcal: number;
    }) => void;
    onCancel: () => void;
    onDelete: () => void;
  }) => {
    const { createElement } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text: RNText } =
      jest.requireActual<typeof import("react-native")>("react-native");

    mockIngredientEditor(props);
    return createElement(
      Pressable,
      {
        testID: "editor-commit",
        onPress: () =>
          props.onCommit({
            id: "ing-1",
            name: "Saved",
            amount: 120,
            unit: "g",
            protein: 10,
            carbs: 20,
            fat: 5,
            kcal: 170,
          }),
      },
      createElement(RNText, null, "ingredient-editor"),
    );
  },
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string }) =>
      options?.ns ? `${options.ns}:${key}` : key,
  }),
}));

describe("IngredientBox", () => {
  it("renders ingredient details in display mode", () => {
    const { getByText } = renderWithTheme(
      <IngredientBox
        ingredient={{
          id: "ing-1",
          name: "Chicken",
          amount: 150,
          unit: "g",
          protein: 30,
          carbs: 2,
          fat: 6,
          kcal: 190,
        }}
      />,
    );

    expect(getByText("Chicken")).toBeTruthy();
    expect(getByText("150g")).toBeTruthy();
  });

  it("falls back to translated ingredient name when missing", () => {
    const { getByText } = renderWithTheme(
      <IngredientBox
        ingredient={{
          id: "ing-1",
          name: "",
          amount: 0,
          unit: "g",
          protein: 0,
          carbs: 0,
          fat: 0,
          kcal: 0,
        }}
      />,
    );

    expect(getByText("meals:ingredient_name")).toBeTruthy();
  });

  it("forwards saved ingredient when initialized in edit mode", () => {
    const onSave = jest.fn();
    const { getByTestId } = renderWithTheme(
      <IngredientBox
        initialEdit
        onSave={onSave}
        ingredient={{
          id: "ing-1",
          name: "Draft",
          amount: 100,
          unit: "g",
          protein: 1,
          carbs: 2,
          fat: 3,
          kcal: 40,
        }}
      />,
    );

    fireEvent.press(getByTestId("editor-commit"));
    expect(onSave).toHaveBeenCalledWith({
      id: "ing-1",
      name: "Saved",
      amount: 120,
      unit: "g",
      protein: 10,
      carbs: 20,
      fat: 5,
      kcal: 170,
    });
  });
});
