import { describe, expect, it } from "@jest/globals";
import { MacroTargetDonut } from "@/feature/Home/components/MacroTargetDonut";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("MacroTargetDonut", () => {
  it("renders nothing when both target and consumed are zero", () => {
    const { toJSON } = renderWithTheme(
      <MacroTargetDonut macro="protein" targetGrams={0} consumedGrams={0} />,
    );

    expect(toJSON()).toBeNull();
  });

  it("renders remaining grams label", () => {
    const { getByText } = renderWithTheme(
      <MacroTargetDonut macro="carbs" targetGrams={100} consumedGrams={30} />,
    );

    expect(getByText("70")).toBeTruthy();
    expect(getByText("g")).toBeTruthy();
  });

  it("renders zero remaining when consumed exceeds target", () => {
    const { getByText } = renderWithTheme(
      <MacroTargetDonut macro="fat" targetGrams={50} consumedGrams={80} />,
    );

    expect(getByText("0")).toBeTruthy();
  });
});
