import { View, StyleSheet } from "react-native";
import { describe, expect, it } from "@jest/globals";
import { LoadingSkeleton } from "@/feature/History/components/LoadingSkeleton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("LoadingSkeleton", () => {
  it("uses default height", () => {
    const { UNSAFE_getByType } = renderWithTheme(<LoadingSkeleton />);
    const styles = StyleSheet.flatten(UNSAFE_getByType(View).props.style);

    expect(styles.height).toBe(80);
  });

  it("uses provided height", () => {
    const { UNSAFE_getByType } = renderWithTheme(<LoadingSkeleton height={120} />);
    const styles = StyleSheet.flatten(UNSAFE_getByType(View).props.style);

    expect(styles.height).toBe(120);
  });
});
