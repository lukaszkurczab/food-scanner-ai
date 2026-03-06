import type { ReactNode } from "react";
import { Pressable, Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import ShareEditorPanel from "@/feature/Meals/share/ShareEditorPanel";
import { defaultShareOptions } from "@/feature/Meals/share/defaultShareOptions";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockTextEditorPanel = jest.fn(
  (props: { selectedId: string | null; onRemoveSelectedCustom?: (id: string) => void }) => (
    <Pressable
      onPress={() => {
        if (!props.selectedId) return;
        props.onRemoveSelectedCustom?.(props.selectedId);
      }}
    >
      <Text>remove-selected</Text>
    </Pressable>
  ),
);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

jest.mock("./editors/TextEditorPanel", () => ({
  __esModule: true,
  default: (props: {
    selectedId: string | null;
    onRemoveSelectedCustom?: (id: string) => void;
  }) => mockTextEditorPanel(props),
}));

jest.mock("./editors/CardEditorPanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./editors/ChartEditorPanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./ColorPickerPanel", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("./DraggableItem", () => ({
  __esModule: true,
  default: ({ children }: { children: ReactNode }) => children,
}));

describe("ShareEditorPanel", () => {
  beforeEach(() => {
    mockTextEditorPanel.mockClear();
  });

  it("removes only selected custom text and focuses first remaining custom", () => {
    const onChange = jest.fn();
    const onTapTextElement = jest.fn();
    const onClose = jest.fn();

    const { getByText } = renderWithTheme(
      <ShareEditorPanel
        visible
        mode="text"
        selectedId="custom:first"
        options={{
          ...defaultShareOptions,
          showTitle: true,
          showKcal: true,
          showCustom: true,
          customTexts: [
            { id: "custom:first", text: "A", x: 0.2, y: 0.2, size: 1, rotation: 0 },
            { id: "custom:second", text: "B", x: 0.7, y: 0.6, size: 1, rotation: 0 },
          ],
        }}
        onChange={onChange}
        onClose={onClose}
        onTapTextElement={onTapTextElement}
      />,
    );

    fireEvent.press(getByText("remove-selected"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customTexts: [
          { id: "custom:second", text: "B", x: 0.7, y: 0.6, size: 1, rotation: 0 },
        ],
        showCustom: true,
      }),
    );
    expect(onTapTextElement).toHaveBeenCalledWith("custom:second");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("removes last custom text, disables custom block and focuses title", () => {
    const onChange = jest.fn();
    const onTapTextElement = jest.fn();
    const onClose = jest.fn();

    const { getByText } = renderWithTheme(
      <ShareEditorPanel
        visible
        mode="text"
        selectedId="custom:last"
        options={{
          ...defaultShareOptions,
          showTitle: true,
          showKcal: true,
          showCustom: true,
          customText: "legacy",
          customTexts: [
            { id: "custom:last", text: "A", x: 0.2, y: 0.2, size: 1, rotation: 0 },
          ],
        }}
        onChange={onChange}
        onClose={onClose}
        onTapTextElement={onTapTextElement}
      />,
    );

    fireEvent.press(getByText("remove-selected"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customTexts: [],
        showCustom: false,
        customText: "",
      }),
    );
    expect(onTapTextElement).toHaveBeenCalledWith("title");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores remove callback for non-custom ids", () => {
    const onChange = jest.fn();
    const onTapTextElement = jest.fn();
    const onClose = jest.fn();

    const { getByText } = renderWithTheme(
      <ShareEditorPanel
        visible
        mode="text"
        selectedId="title"
        options={{
          ...defaultShareOptions,
          showTitle: true,
          showKcal: true,
          showCustom: true,
          customTexts: [
            { id: "custom:last", text: "A", x: 0.2, y: 0.2, size: 1, rotation: 0 },
          ],
        }}
        onChange={onChange}
        onClose={onClose}
        onTapTextElement={onTapTextElement}
      />,
    );

    fireEvent.press(getByText("remove-selected"));

    expect(onChange).not.toHaveBeenCalled();
    expect(onTapTextElement).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes panel after removing last custom when title and kcal are hidden", () => {
    const onChange = jest.fn();
    const onTapTextElement = jest.fn();
    const onClose = jest.fn();

    const { getByText } = renderWithTheme(
      <ShareEditorPanel
        visible
        mode="text"
        selectedId="custom:last"
        options={{
          ...defaultShareOptions,
          showTitle: false,
          showKcal: false,
          showCustom: true,
          customTexts: [
            { id: "custom:last", text: "A", x: 0.2, y: 0.2, size: 1, rotation: 0 },
          ],
        }}
        onChange={onChange}
        onClose={onClose}
        onTapTextElement={onTapTextElement}
      />,
    );

    fireEvent.press(getByText("remove-selected"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        customTexts: [],
        showCustom: false,
      }),
    );
    expect(onTapTextElement).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
