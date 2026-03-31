import { TextInput as RNTextInput } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { IngredientEditor } from "@/components/IngredientEditor";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string }) =>
      options?.ns ? `${options.ns}:${key}` : key,
  }),
}));

describe("IngredientEditor", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it("supports the sheet variant actions for adding a new ingredient", () => {
    const onCommit = jest.fn();
    const onCancel = jest.fn();
    const { getByText, queryByText } = renderWithTheme(
      <IngredientEditor
        initial={{
          id: "ing-2",
          name: "",
          amount: 1,
          unit: "g",
          protein: 0,
          carbs: 0,
          fat: 0,
          kcal: 0,
        }}
        variant="sheet"
        submitLabel="meals:add_ingredient"
        showDelete={false}
        onCommit={onCommit}
        onCancel={onCancel}
        onDelete={() => undefined}
      />,
    );

    fireEvent.press(getByText("common:cancel"));
    fireEvent.press(getByText("meals:add_ingredient"));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(queryByText("common:remove")).toBeNull();
  });
});
