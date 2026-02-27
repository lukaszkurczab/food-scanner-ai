import { StyleSheet, View } from "react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { TargetProgressBar } from "@/components/TargetProgressBar";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("TargetProgressBar", () => {
  it("renders progress text and percentage", () => {
    const { getByText } = renderWithTheme(
      <TargetProgressBar current={1200} target={2000} />,
    );

    expect(getByText("1200 of 2000 kcal")).toBeTruthy();
    expect(getByText("60%")).toBeTruthy();
  });

  it("clamps percentage to 100 and uses custom height", () => {
    const { getByText, getByLabelText, UNSAFE_getAllByType } = renderWithTheme(
      <TargetProgressBar current={2500} target={2000} height={20} />,
    );

    expect(getByText("100%")).toBeTruthy();
    expect(getByLabelText("Progress: 100%")).toBeTruthy();

    const views = UNSAFE_getAllByType(View);
    const barStyle = StyleSheet.flatten(
      views.find((v) => v.props.accessibilityRole === "progressbar")?.props.style,
    );
    expect(barStyle.height).toBe(20);
  });

  it("fires threshold callback when threshold is reached", () => {
    const onThreshold = jest.fn();
    renderWithTheme(
      <TargetProgressBar
        current={1700}
        target={2000}
        thresholdPct={0.8}
        onThreshold={onThreshold}
      />,
    );

    expect(onThreshold).toHaveBeenCalledTimes(1);
  });
});
