import { View } from "react-native";
import { describe, expect, it } from "@jest/globals";
import ProgressDots from "@/feature/Onboarding/components/ProgressDots";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("Onboarding ProgressDots", () => {
  it("renders exactly total number of dots", () => {
    const { UNSAFE_getAllByType } = renderWithTheme(
      <ProgressDots step={2} total={5} />,
    );

    const views = UNSAFE_getAllByType(View);
    expect(views.length).toBe(6);
  });

  it("renders no dots when total is zero", () => {
    const { UNSAFE_getAllByType } = renderWithTheme(
      <ProgressDots step={1} total={0} />,
    );

    const views = UNSAFE_getAllByType(View);
    expect(views.length).toBe(1);
  });
});
