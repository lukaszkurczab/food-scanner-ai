import { describe, expect, it, jest } from "@jest/globals";
import { MacroChip } from "@/components/MacroChip";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("MacroChip", () => {
  it("renders translated label, default unit and rounded value", () => {
    const { getByText } = renderWithTheme(
      <MacroChip kind="protein" value={24.6} />,
    );

    expect(getByText("translated:meals:protein")).toBeTruthy();
    expect(getByText("[g]")).toBeTruthy();
    expect(getByText("25")).toBeTruthy();
  });

  it("supports custom label and unit", () => {
    const { getByText, queryByText } = renderWithTheme(
      <MacroChip kind="kcal" value={189.2} label="Energy" unit="kcal/day" />,
    );

    expect(getByText("Energy")).toBeTruthy();
    expect(getByText("kcal/day")).toBeTruthy();
    expect(getByText("189")).toBeTruthy();
    expect(queryByText("translated:meals:calories")).toBeNull();
  });
});
