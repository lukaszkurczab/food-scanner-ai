import { Text, View } from "react-native";
import { describe, expect, it } from "@jest/globals";
import ProgressDots from "@/feature/Onboarding/components/ProgressDots";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("Onboarding ProgressDots", () => {
  it("renders exactly total number of progress segments", () => {
    const { UNSAFE_getAllByType } = renderWithTheme(
      <ProgressDots step={2} total={5} label="Step 2 of 5" />,
    );

    const views = UNSAFE_getAllByType(View);
    const texts = UNSAFE_getAllByType(Text);

    expect(texts).toHaveLength(1);
    expect(views.length).toBe(7);
  });

  it("renders no dots when total is zero", () => {
    const { UNSAFE_getAllByType } = renderWithTheme(
      <ProgressDots step={1} total={0} />,
    );

    const views = UNSAFE_getAllByType(View);
    expect(views.length).toBe(2);
  });
});
