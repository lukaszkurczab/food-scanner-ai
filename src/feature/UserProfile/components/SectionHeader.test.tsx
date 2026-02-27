import { describe, expect, it } from "@jest/globals";
import { SectionHeader } from "@/feature/UserProfile/components/SectionHeader";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("UserProfile SectionHeader", () => {
  it("renders label", () => {
    const { getByText } = renderWithTheme(<SectionHeader label="Preferences" />);

    expect(getByText("Preferences")).toBeTruthy();
  });
});
