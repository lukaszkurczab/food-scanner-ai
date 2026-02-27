import { describe, expect, it } from "@jest/globals";
import { Bubble } from "@/feature/AI/components/Bubble";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("Bubble", () => {
  it("renders text with markdown-like inline styles and bullet rows", () => {
    const { getByText } = renderWithTheme(
      <Bubble
        role="ai"
        text={"Hello **World**\n- *protein* tip"}
      />,
    );

    expect(getByText("Hello ")).toBeTruthy();
    expect(getByText("World")).toBeTruthy();
    expect(getByText("•")).toBeTruthy();
    expect(getByText("protein")).toBeTruthy();
    expect(getByText(" tip")).toBeTruthy();
  });

  it("renders timestamp when provided", () => {
    const timestamp = new Date("2026-02-26T10:25:00.000Z");
    const expected = timestamp.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const { getByText } = renderWithTheme(
      <Bubble role="user" text="message" timestamp={timestamp} />,
    );

    expect(getByText(expected)).toBeTruthy();
  });
});
