import { describe, expect, it } from "@jest/globals";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("AiCreditsBadge", () => {
  it("renders provided text", () => {
    const { getByText } = renderWithTheme(
      <AiCreditsBadge text="5 AI Credits" />,
    );

    expect(getByText("5 AI Credits")).toBeTruthy();
  });

  it("supports neutral tone", () => {
    const { getByText } = renderWithTheme(
      <AiCreditsBadge text="0 AI Credits" tone="neutral" />,
    );

    expect(getByText("0 AI Credits")).toBeTruthy();
  });
});
