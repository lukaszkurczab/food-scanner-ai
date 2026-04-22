import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Pressable, Text } from "react-native";
import * as Sentry from "@sentry/react-native";
import ErrorBoundary from "@/components/ErrorBoundary";

jest.mock("react-i18next", () => ({
  withTranslation: () => (Component: React.ComponentType<Record<string, unknown>>) => {
    const WrappedWithTranslation = (props: Record<string, unknown>) => (
      <Component
        {...props}
        t={(key: string) => {
          if (key === "common:errorBoundary.title") return "Something went wrong";
          if (key === "common:errorBoundary.description") {
            return "The app encountered an unexpected error.";
          }
          if (key === "common:errorBoundary.restart") return "Restart";
          return key;
        }}
      />
    );

    WrappedWithTranslation.displayName = "WrappedWithTranslation";
    return WrappedWithTranslation;
  },
}));

const captureExceptionMock = Sentry.captureException as jest.Mock;

function ThrowError({ error }: { error: Error }): React.ReactElement {
  throw error;
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    captureExceptionMock.mockClear();
    jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("renders children when no error is thrown", () => {
    const { getByText, queryByText } = render(
      <ErrorBoundary>
        <Text>Safe child</Text>
      </ErrorBoundary>,
    );

    expect(getByText("Safe child")).toBeTruthy();
    expect(queryByText("Something went wrong")).toBeNull();
  });

  it("renders fallback UI when child throws", () => {
    const error = new Error("boom");
    const { getByText } = render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>,
    );

    expect(getByText("Something went wrong")).toBeTruthy();
    expect(getByText("The app encountered an unexpected error.")).toBeTruthy();
    expect(getByText("Restart")).toBeTruthy();
  });

  it("calls Sentry.captureException when child throws", () => {
    const error = new Error("capture-me");
    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>,
    );

    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).toHaveBeenCalledWith(error);
  });

  it("resets error state after pressing Restart", () => {
    const RecoverableChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error("temporary");
      }
      return <Text>Recovered child</Text>;
    };

    const Harness = () => {
      const [shouldThrow, setShouldThrow] = React.useState(true);

      return (
        <>
          <Pressable onPress={() => setShouldThrow(false)}>
            <Text>Set healthy child</Text>
          </Pressable>
          <ErrorBoundary>
            <RecoverableChild shouldThrow={shouldThrow} />
          </ErrorBoundary>
        </>
      );
    };

    const { getByText, queryByText } = render(<Harness />);

    fireEvent.press(getByText("Set healthy child"));

    fireEvent.press(getByText("Restart"));

    expect(queryByText("Something went wrong")).toBeNull();
    expect(getByText("Recovered child")).toBeTruthy();
  });
});
