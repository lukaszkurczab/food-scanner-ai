import { fireEvent } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Modal as RNModal, Text, TouchableWithoutFeedback, View } from "react-native";
import { InputModal } from "@/components/InputModal";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockGlobalActionButtons = jest.fn(
  ({
    label,
    onPress,
    secondaryLabel,
    secondaryOnPress,
  }: {
    label: string;
    onPress?: () => void;
    secondaryLabel?: string;
    secondaryOnPress?: () => void;
  }) => (
    <View>
      <Text onPress={onPress}>{label}</Text>
      {secondaryLabel ? (
        <Text onPress={secondaryOnPress}>{secondaryLabel}</Text>
      ) : null}
    </View>
  ),
);

const mockIconButton = jest.fn(
  ({
    onPress,
    accessibilityLabel,
  }: {
    onPress?: () => void;
    accessibilityLabel?: string;
  }) => <Text onPress={onPress}>{accessibilityLabel ?? "icon-button"}</Text>,
);

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/GlobalActionButtons", () => ({
  GlobalActionButtons: (
    props: {
      label: string;
      onPress?: () => void;
      secondaryLabel?: string;
      secondaryOnPress?: () => void;
    },
  ) => mockGlobalActionButtons(props),
}));

jest.mock("@/components/IconButton", () => ({
  IconButton: (
    props: {
      onPress?: () => void;
      accessibilityLabel?: string;
    },
  ) => mockIconButton(props),
}));

describe("InputModal", () => {
  beforeEach(() => {
    mockGlobalActionButtons.mockClear();
    mockIconButton.mockClear();
  });

  it("renders content and propagates text input changes", () => {
    const onChange = jest.fn();
    const { getByText, getByLabelText } = renderWithTheme(
      <InputModal
        visible
        title="Change email"
        message="Enter a new value"
        value=""
        placeholder="Email"
        error="Invalid value"
        onChange={onChange}
      />,
    );

    expect(getByText("Change email")).toBeTruthy();
    expect(getByText("Enter a new value")).toBeTruthy();
    expect(getByText("Invalid value")).toBeTruthy();

    fireEvent.changeText(getByLabelText("Email"), "next@example.com");
    expect(onChange).toHaveBeenCalledWith("next@example.com");
  });

  it("handles primary and secondary actions", () => {
    const onPrimaryAction = jest.fn();
    const onSecondaryAction = jest.fn();
    const { getByText } = renderWithTheme(
      <InputModal
        visible
        value=""
        onChange={() => undefined}
        primaryActionLabel="Save"
        secondaryActionLabel="Cancel"
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
      />,
    );

    fireEvent.press(getByText("Save"));
    fireEvent.press(getByText("Cancel"));

    expect(onPrimaryAction).toHaveBeenCalledTimes(1);
    expect(onSecondaryAction).toHaveBeenCalledTimes(1);
    const rowLayoutProps = mockGlobalActionButtons.mock.calls.at(-1)?.[0];
    expect(rowLayoutProps).toEqual(
      expect.objectContaining({
        layout: "row",
        rowOrder: "secondary-primary",
      }),
    );
  });

  it("supports secure text input mode", () => {
    const { getByLabelText, UNSAFE_getByType, getByText } = renderWithTheme(
      <InputModal
        visible
        value=""
        onChange={() => undefined}
        placeholder="Password"
        secureTextEntry
        onClose={() => undefined}
      />,
    );

    expect(getByLabelText("Password").props.secureTextEntry).toBe(true);
    expect(UNSAFE_getByType(RNModal).props.animationType).toBe("fade");
    expect(getByText("Close")).toBeTruthy();
  });

  it("supports full-screen custom actions and backdrop close", () => {
    const onClose = jest.fn();
    const primaryAction = {
      label: "Apply",
      onPress: jest.fn(),
      loading: true,
      disabled: true,
      testID: "apply-action",
      tone: "ghost" as const,
    };
    const secondaryAction = {
      label: "Dismiss",
      onPress: jest.fn(),
      loading: false,
      disabled: true,
      testID: "dismiss-action",
      tone: "destructive" as const,
    };

    const { UNSAFE_getByType } = renderWithTheme(
      <InputModal
        visible
        value=""
        onChange={() => undefined}
        fullScreen
        onClose={onClose}
        primaryAction={primaryAction}
        secondaryAction={secondaryAction}
      />,
    );

    expect(UNSAFE_getByType(RNModal).props.animationType).toBe("slide");
    const fullScreenActionProps = mockGlobalActionButtons.mock.calls.at(-1)?.[0];
    expect(fullScreenActionProps).toEqual(
      expect.objectContaining({
        label: "Apply",
        loading: true,
        disabled: true,
        testID: "apply-action",
        tone: "ghost",
        secondaryLabel: "Dismiss",
        secondaryDisabled: true,
        secondaryTestID: "dismiss-action",
        secondaryTone: "destructive",
        layout: "column",
      }),
    );

    UNSAFE_getByType(TouchableWithoutFeedback).props.onPress();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders footer instead of action buttons when provided", () => {
    const { getByText } = renderWithTheme(
      <InputModal
        visible
        value=""
        onChange={() => undefined}
        footer={<Text>Custom footer</Text>}
        primaryActionLabel="Save"
      />,
    );

    expect(getByText("Custom footer")).toBeTruthy();
    expect(mockGlobalActionButtons).not.toHaveBeenCalled();
  });
});
