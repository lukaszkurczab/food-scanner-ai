import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
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
    onChangePartial?: (patch: {
      name?: string;
      amount?: number;
    }) => void;
  }) => {
    const { createElement, Fragment } =
      jest.requireActual<typeof import("react")>("react");
    const { Pressable, Text: RNText } =
      jest.requireActual<typeof import("react-native")>("react-native");

    mockIngredientEditor(props);
    return createElement(Fragment, null,
      createElement(
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
      ),
      createElement(
        Pressable,
        {
          testID: "editor-cancel",
          onPress: props.onCancel,
        },
        createElement(RNText, null, "cancel-editor"),
      ),
      createElement(
        Pressable,
        {
          testID: "editor-delete",
          onPress: props.onDelete,
        },
        createElement(RNText, null, "delete-editor"),
      ),
      createElement(
        Pressable,
        {
          testID: "editor-change-partial",
          onPress: () => props.onChangePartial?.({ name: "Draft", amount: 55 }),
        },
        createElement(RNText, null, "change-partial"),
      ),
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
  beforeEach(() => {
    mockIngredientEditor.mockClear();
  });

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
    expect(getByText("meals:calories")).toBeTruthy();
  });

  it("falls back to grams when ingredient unit is not provided", () => {
    const { getByText } = renderWithTheme(
      <IngredientBox
        ingredient={{
          id: "ing-1",
          name: "Soup",
          amount: 250,
          protein: 5,
          carbs: 9,
          fat: 2,
          kcal: 80,
        }}
      />,
    );

    expect(getByText("250g")).toBeTruthy();
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

  it("hides the action trigger when component is not editable", () => {
    const { queryAllByRole } = renderWithTheme(
      <IngredientBox
        editable={false}
        ingredient={{
          id: "ing-1",
          name: "Rice",
          amount: 100,
          unit: "g",
          protein: 2,
          carbs: 28,
          fat: 1,
          kcal: 130,
        }}
      />,
    );

    expect(queryAllByRole("button")).toHaveLength(0);
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

  it("forwards partial updates to the ingredient editor", () => {
    const onChangePartial = jest.fn();
    const { getByTestId } = renderWithTheme(
      <IngredientBox
        initialEdit
        onChangePartial={onChangePartial}
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

    fireEvent.press(getByTestId("editor-change-partial"));
    expect(onChangePartial).toHaveBeenCalledWith({ name: "Draft", amount: 55 });
  });

  it("calls cancel handler when editor is dismissed", () => {
    const onCancelEdit = jest.fn();
    const { getByTestId, queryByTestId } = renderWithTheme(
      <IngredientBox
        initialEdit
        onCancelEdit={onCancelEdit}
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

    fireEvent.press(getByTestId("editor-cancel"));
    expect(onCancelEdit).toHaveBeenCalledTimes(1);
    expect(queryByTestId("editor-cancel")).toBeNull();
  });

  it("deletes the ingredient from edit mode", () => {
    const onRemove = jest.fn();
    const { getByTestId } = renderWithTheme(
      <IngredientBox
        initialEdit
        onRemove={onRemove}
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

    fireEvent.press(getByTestId("editor-delete"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
