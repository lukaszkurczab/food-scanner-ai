import { describe, expect, it } from "@jest/globals";
import { StreakBadge } from "@/components/StreakBadge";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("StreakBadge", () => {
  it("renders numeric value with fire icon", () => {
    const { getByText } = renderWithTheme(<StreakBadge value={12} />);

    expect(getByText("12🔥")).toBeTruthy();
  });
});
