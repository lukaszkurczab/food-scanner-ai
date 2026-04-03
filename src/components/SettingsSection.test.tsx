import { describe, expect, it } from "@jest/globals";
import { SettingsRow } from "@/components/SettingsRow";
import { SettingsSection } from "@/components/SettingsSection";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("SettingsSection", () => {
  it("renders heading and footer content around grouped rows", () => {
    const { getByText } = renderWithTheme(
      <SettingsSection
        eyebrow="Account"
        title="Profile details"
        footer="Use shared rows inside this section."
      >
        <SettingsRow title="Username" />
        <SettingsRow title="Email" />
      </SettingsSection>,
    );

    expect(getByText("Account")).toBeTruthy();
    expect(getByText("Profile details")).toBeTruthy();
    expect(getByText("Use shared rows inside this section.")).toBeTruthy();
    expect(getByText("Username")).toBeTruthy();
    expect(getByText("Email")).toBeTruthy();
  });
});
