import { describe, expect, it } from "@jest/globals";
import { themes } from "@/theme/themes";

describe("themes", () => {
  it("defines input state tokens for the light theme", () => {
    expect(themes.light.input).toEqual(
      expect.objectContaining({
        background: "#FFFDF8",
        backgroundError: "#F9E9E5",
        backgroundDisabled: "#EFE7DA",
        border: "#CFC5B8",
        borderDisabled: "#E2D7C7",
        borderFocused: "#6F8A69",
        borderError: "#C24E3D",
      }),
    );
  });

  it("defines input state tokens for the dark theme", () => {
    expect(themes.dark.input).toEqual(
      expect.objectContaining({
        background: "#202520",
        backgroundError: "#2D201D",
        backgroundDisabled: "#1B1F1B",
        borderDisabled: "#2E342E",
        borderFocused: "#6F8A69",
        borderError: "#C85D4C",
      }),
    );
  });
});
