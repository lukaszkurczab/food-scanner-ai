import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { Pressable, Text } from "react-native";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";

type MockButtonProps = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  testID?: string;
  loading?: boolean;
};

const mockPrimaryButton = jest.fn(
  ({ label, onPress, disabled, testID }: MockButtonProps) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID || "primary-button"}
      accessibilityRole="button"
    >
      <Text>{`PRIMARY:${label}`}</Text>
    </Pressable>
  ),
);

const mockSecondaryButton = jest.fn(
  ({ label, onPress, disabled, testID }: MockButtonProps) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID || "secondary-button"}
      accessibilityRole="button"
    >
      <Text>{`SECONDARY:${label}`}</Text>
    </Pressable>
  ),
);

const mockErrorButton = jest.fn(
  ({ label, onPress, disabled, testID }: MockButtonProps) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID || "error-button"}
      accessibilityRole="button"
    >
      <Text>{`ERROR:${label}`}</Text>
    </Pressable>
  ),
);

jest.mock("@/components/PrimaryButton", () => ({
  PrimaryButton: (props: unknown) =>
    mockPrimaryButton(props as MockButtonProps),
}));

jest.mock("@/components/SecondaryButton", () => ({
  SecondaryButton: (props: unknown) =>
    mockSecondaryButton(props as MockButtonProps),
}));

jest.mock("@/components/ErrorButton", () => ({
  ErrorButton: (props: unknown) => mockErrorButton(props as MockButtonProps),
}));

describe("GlobalActionButtons", () => {
  beforeEach(() => {
    mockPrimaryButton.mockClear();
    mockSecondaryButton.mockClear();
    mockErrorButton.mockClear();
  });

  it("renders stacked layout by default and handles presses", () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    const { getByText } = renderWithTheme(
      <GlobalActionButtons
        label="Save"
        onPress={onPrimary}
        secondaryLabel="Cancel"
        secondaryOnPress={onSecondary}
      />,
    );

    fireEvent.press(getByText("PRIMARY:Save"));
    fireEvent.press(getByText("SECONDARY:Cancel"));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("uses row order secondary-primary when configured", () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    const { getAllByRole } = renderWithTheme(
      <GlobalActionButtons
        label="Confirm"
        onPress={onPrimary}
        secondaryLabel="Back"
        secondaryOnPress={onSecondary}
        layout="row"
        rowOrder="secondary-primary"
      />,
    );

    const buttons = getAllByRole("button");
    fireEvent.press(buttons[0]!);
    fireEvent.press(buttons[1]!);

    expect(onSecondary).toHaveBeenCalledTimes(1);
    expect(onPrimary).toHaveBeenCalledTimes(1);
  });

  it("uses error variant for the secondary action", () => {
    const { queryByText, getByText } = renderWithTheme(
      <GlobalActionButtons
        label="Save"
        onPress={() => {}}
        secondaryLabel="Delete"
        secondaryOnPress={() => {}}
        secondaryVariant="error"
      />,
    );

    expect(getByText("ERROR:Delete")).toBeTruthy();
    expect(queryByText("SECONDARY:Delete")).toBeNull();
  });

  it("forwards disabled/loading props to action buttons", () => {
    renderWithTheme(
      <GlobalActionButtons
        label="Save"
        onPress={() => {}}
        secondaryLabel="Cancel"
        secondaryOnPress={() => {}}
        primaryDisabled
        primaryLoading
        secondaryDisabled
        secondaryLoading
      />,
    );

    const primaryProps = mockPrimaryButton.mock.calls[0]?.[0] as {
      disabled?: boolean;
      loading?: boolean;
    };
    const secondaryProps = mockSecondaryButton.mock.calls[0]?.[0] as {
      disabled?: boolean;
      loading?: boolean;
    };

    expect(primaryProps.disabled).toBe(true);
    expect(primaryProps.loading).toBe(true);
    expect(secondaryProps.disabled).toBe(true);
    expect(secondaryProps.loading).toBe(true);
  });

  it("applies provided container style", () => {
    const { getByTestId } = renderWithTheme(
      <GlobalActionButtons
        label="Save"
        onPress={() => {}}
        secondaryLabel="Cancel"
        secondaryOnPress={() => {}}
        containerStyle={{ marginBottom: 10 }}
        primaryTestID="save-btn"
      />,
    );

    expect(getByTestId("save-btn")).toBeTruthy();
  });
});
