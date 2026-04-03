import { Text, View } from "react-native";
import { describe, expect, it } from "@jest/globals";
import { InfoBlock } from "@/components/InfoBlock";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import { themes } from "@/theme/themes";

describe("InfoBlock", () => {
  it("renders copy and uses semantic tone styling", () => {
    const { getByText, UNSAFE_getByType } = renderWithTheme(
      <InfoBlock
        title="Data and AI"
        body="Shared informational blocks should stay within semantic roles."
        tone="error"
        icon={<Text>i</Text>}
      />,
    );

    expect(getByText("Data and AI")).toBeTruthy();
    expect(
      getByText("Shared informational blocks should stay within semantic roles."),
    ).toBeTruthy();
    expect(UNSAFE_getByType(View).props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: themes.light.error.surface,
          borderColor: themes.light.error.border,
        }),
      ]),
    );
  });
});
