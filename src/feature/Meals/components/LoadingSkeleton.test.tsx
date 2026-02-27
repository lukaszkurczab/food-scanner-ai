import { StyleSheet, View } from "react-native";
import { describe, expect, it } from "@jest/globals";
import { LoadingSkeleton } from "@/feature/Meals/components/LoadingSkeleton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("Meals LoadingSkeleton", () => {
  it("uses default height", () => {
    const { UNSAFE_getByType } = renderWithTheme(<LoadingSkeleton />);
    const styles = StyleSheet.flatten(UNSAFE_getByType(View).props.style);

    expect(styles.height).toBe(80);
  });

  it("uses provided height", () => {
    const { UNSAFE_getByType } = renderWithTheme(<LoadingSkeleton height={96} />);
    const styles = StyleSheet.flatten(UNSAFE_getByType(View).props.style);

    expect(styles.height).toBe(96);
  });
});
