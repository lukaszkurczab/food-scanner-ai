import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Alert } from "@/components/Alert";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("Alert", () => {
  it("renders title, message and handles action presses", () => {
    const onPrimary = jest.fn();
    const onSecondary = jest.fn();
    const { getByText, getByTestId } = renderWithTheme(
      <Alert
        visible
        title="Sync failed"
        message="Try again"
        primaryAction={{
          label: "Retry",
          onPress: onPrimary,
          testID: "alert-primary",
        }}
        secondaryAction={{
          label: "Cancel",
          onPress: onSecondary,
          testID: "alert-secondary",
        }}
      />,
    );

    expect(getByText("Sync failed")).toBeTruthy();
    expect(getByText("Try again")).toBeTruthy();

    fireEvent.press(getByTestId("alert-primary"));
    fireEvent.press(getByTestId("alert-secondary"));

    expect(onPrimary).toHaveBeenCalledTimes(1);
    expect(onSecondary).toHaveBeenCalledTimes(1);
  });

  it("does not render message when it is missing", () => {
    const { getByText, queryByText } = renderWithTheme(
      <Alert visible title="Info" />,
    );

    expect(getByText("Info")).toBeTruthy();
    expect(queryByText("Try again")).toBeNull();
  });

  it("disables action press while loading", () => {
    const onPrimary = jest.fn();
    const { queryByText, getByTestId } = renderWithTheme(
      <Alert
        visible
        title="Sync"
        primaryAction={{
          label: "Retry",
          onPress: onPrimary,
          loading: true,
          testID: "alert-primary",
        }}
      />,
    );

    expect(queryByText("Retry")).toBeNull();
    fireEvent.press(getByTestId("alert-primary"));
    expect(onPrimary).not.toHaveBeenCalled();
  });
});
