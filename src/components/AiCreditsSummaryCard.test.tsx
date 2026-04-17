import { describe, expect, it, jest } from "@jest/globals";
import { AiCreditsSummaryCard } from "@/components/AiCreditsSummaryCard";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

jest.mock("@/utils/formatLocalDateTime", () => ({
  formatLocalDateTime: (value?: string | null) =>
    value ? "14.05.2026, 12:00" : null,
}));

describe("AiCreditsSummaryCard", () => {
  it("renders balance, allocation, tier and renewal date", () => {
    const { getByText } = renderWithTheme(
      <AiCreditsSummaryCard
        balance={76}
        allocation={800}
        tier="premium"
        renewalAt="2026-05-14T10:00:00.000Z"
      />,
    );

    expect(getByText("AI Credits")).toBeTruthy();
    expect(getByText("76")).toBeTruthy();
    expect(getByText("800")).toBeTruthy();
    expect(getByText("Premium")).toBeTruthy();
    expect(getByText("14.05.2026, 12:00")).toBeTruthy();
  });

  it("renders placeholders while loading", () => {
    const { getAllByText } = renderWithTheme(
      <AiCreditsSummaryCard
        balance={null}
        allocation={null}
        tier={null}
        renewalAt={null}
        loading
      />,
    );

    expect(getAllByText("...").length).toBeGreaterThanOrEqual(4);
  });
});
