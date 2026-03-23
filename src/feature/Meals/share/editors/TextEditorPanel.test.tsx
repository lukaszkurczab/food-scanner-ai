import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import TextEditorPanel from "@/feature/Meals/share/editors/TextEditorPanel";
import { defaultShareOptions } from "@/feature/Meals/share/defaultShareOptions";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("../ColorPickerPanel", () => ({
  __esModule: true,
  default: () => null,
}));

describe("TextEditorPanel", () => {
  it("shows remove button for selected existing custom text and calls callback", () => {
    const onRemoveSelectedCustom = jest.fn<(id: string) => void>();

    const { getByText } = renderWithTheme(
      <TextEditorPanel
        options={{
          ...defaultShareOptions,
          showCustom: true,
          customTexts: [
            {
              id: "custom:one",
              text: "Test",
              x: 0.5,
              y: 0.42,
              size: 1,
              rotation: 0,
            },
          ],
        }}
        selectedId="custom:one"
        onChange={() => undefined}
        onRemoveSelectedCustom={onRemoveSelectedCustom}
      />,
    );

    fireEvent.press(getByText("common:remove"));

    expect(onRemoveSelectedCustom).toHaveBeenCalledWith("custom:one");
  });

  it("does not show remove button for title and kcal", () => {
    const options = {
      ...defaultShareOptions,
      showTitle: true,
      showKcal: true,
      showCustom: true,
      customTexts: [
        {
          id: "custom:one",
          text: "Test",
          x: 0.5,
          y: 0.42,
          size: 1,
          rotation: 0,
        },
      ],
    };

    const { queryByText, rerender } = renderWithTheme(
      <TextEditorPanel
        options={options}
        selectedId="title"
        onChange={() => undefined}
      />,
    );

    expect(queryByText("common:remove")).toBeNull();

    rerender(
      <TextEditorPanel
        options={options}
        selectedId="kcal"
        onChange={() => undefined}
      />,
    );

    expect(queryByText("common:remove")).toBeNull();
  });
});
