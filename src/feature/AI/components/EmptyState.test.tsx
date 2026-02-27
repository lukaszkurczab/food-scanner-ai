import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { EmptyState } from "@/feature/AI/components/EmptyState";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("AI EmptyState", () => {
  it("renders optional content and handles suggestion/cta presses", () => {
    const onPick = jest.fn();
    const onCta = jest.fn();

    const { getByText, getByLabelText } = renderWithTheme(
      <EmptyState
        title="Ask AI"
        subtitle="Try one of these"
        footerText="You can ask anything"
        suggestions={[
          { label: "Calories?", value: "calories" },
          { label: "Protein?", value: "protein" },
        ]}
        cta={{ label: "Upgrade", onPress: onCta }}
        onPick={onPick}
      />,
    );

    expect(getByText("Ask AI")).toBeTruthy();
    expect(getByText("Try one of these")).toBeTruthy();
    expect(getByText("You can ask anything")).toBeTruthy();

    fireEvent.press(getByLabelText("Calories?"));
    fireEvent.press(getByLabelText("Upgrade"));

    expect(onPick).toHaveBeenCalledWith("calories");
    expect(onCta).toHaveBeenCalledTimes(1);
  });

  it("disables interactions when disabled", () => {
    const onPick = jest.fn();
    const onCta = jest.fn();
    const { getByLabelText } = renderWithTheme(
      <EmptyState
        title="Ask AI"
        suggestions={[{ label: "Calories?", value: "calories" }]}
        cta={{ label: "Upgrade", onPress: onCta }}
        onPick={onPick}
        disabled
      />,
    );

    fireEvent.press(getByLabelText("Calories?"));
    fireEvent.press(getByLabelText("Upgrade"));

    expect(onPick).not.toHaveBeenCalled();
    expect(onCta).not.toHaveBeenCalled();
  });
});
