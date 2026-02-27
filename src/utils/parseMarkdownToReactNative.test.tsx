import React from "react";
import { render } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { lightTheme } from "@/theme/themes";
import { spacing } from "@/theme/spacing";
import { rounded } from "@/theme/rounded";
import { typography } from "@/theme/typography";
import { parseMarkdownToReactNative } from "@/utils/parseMarkdownToReactNative";
import type { useTheme } from "@/theme/useTheme";

type ThemeType = ReturnType<typeof useTheme>;

const createTheme = (): ThemeType =>
  ({
    ...lightTheme,
    spacing,
    rounded,
    typography,
    setMode: jest.fn(),
  }) as ThemeType;

describe("parseMarkdownToReactNative", () => {
  it("renders headings, bullet points and paragraphs", () => {
    const theme = createTheme();
    const nodes = parseMarkdownToReactNative(
      [
        "# Main heading",
        "## Sub heading",
        "- **Bold bullet** tail",
        "- Plain bullet",
        "Paragraph with **bold** text",
        "",
        "Plain line",
      ].join("\n"),
      theme,
    );

    const { getAllByText, getByText } = render(<>{nodes}</>);

    expect(getByText("Main heading")).toBeTruthy();
    expect(getByText("Sub heading")).toBeTruthy();
    expect(getAllByText("• ")).toHaveLength(2);
    expect(getByText("Bold bullet")).toBeTruthy();
    expect(getByText("Plain bullet")).toBeTruthy();
    expect(getByText("Paragraph with bold text")).toBeTruthy();
    expect(getByText("bold")).toBeTruthy();
    expect(getByText("Plain line")).toBeTruthy();
  });

  it("reuses cached style objects for same theme and rebuilds for different theme", () => {
    const theme = createTheme();
    const first = parseMarkdownToReactNative("# Title", theme) as React.ReactElement[];
    const second = parseMarkdownToReactNative("# Title", theme) as React.ReactElement[];
    const anotherTheme = {
      ...theme,
      text: "#101010",
    } as ThemeType;
    const third = parseMarkdownToReactNative("# Title", anotherTheme) as React.ReactElement[];
    const styleOf = (node: React.ReactElement) =>
      (node as React.ReactElement<{ style: unknown }>).props.style;

    expect(styleOf(first[0])).toBe(styleOf(second[0]));
    expect(styleOf(second[0])).not.toBe(styleOf(third[0]));
  });
});
