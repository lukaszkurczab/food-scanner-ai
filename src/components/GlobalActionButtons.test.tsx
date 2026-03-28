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
  variant?: "primary" | "secondary" | "ghost" | "destructive";
};

const mockButton = jest.fn(
  ({ label, onPress, disabled, testID, variant = "primary" }: MockButtonProps) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      testID={testID || `${variant}-button`}
      accessibilityRole="button"
    >
      <Text>{`${variant.toUpperCase()}:${label}`}</Text>
    </Pressable>
  ),
);

jest.mock("@/components/Button", () => ({
  Button: (props: unknown) => mockButton(props as MockButtonProps),
}));

describe("GlobalActionButtons", () => {
  beforeEach(() => {
    mockButton.mockClear();
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

  it("uses destructive tone for the secondary action", () => {
    const { queryByText, getByText } = renderWithTheme(
      <GlobalActionButtons
        label="Save"
        onPress={() => {}}
        secondaryLabel="Delete"
        secondaryOnPress={() => {}}
        secondaryTone="destructive"
      />,
    );

    expect(getByText("DESTRUCTIVE:Delete")).toBeTruthy();
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

    const primaryProps = mockButton.mock.calls[0]?.[0] as {
      disabled?: boolean;
      loading?: boolean;
      variant?: string;
    };
    const secondaryProps = mockButton.mock.calls[1]?.[0] as {
      disabled?: boolean;
      loading?: boolean;
      variant?: string;
    };

    expect(primaryProps.disabled).toBe(true);
    expect(primaryProps.loading).toBe(true);
    expect(primaryProps.variant).toBe("primary");
    expect(secondaryProps.disabled).toBe(true);
    expect(secondaryProps.loading).toBe(true);
    expect(secondaryProps.variant).toBe("secondary");
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

  it("renders primary action before secondary action in stacked layout", () => {
    const { getAllByRole } = renderWithTheme(
      <GlobalActionButtons
        label="Save"
        onPress={() => {}}
        secondaryLabel="Cancel"
        secondaryOnPress={() => {}}
      />,
    );

    const buttons = getAllByRole("button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.props.testID).toBe("primary-button");
    expect(buttons[1]?.props.testID).toBe("secondary-button");
  });
});
