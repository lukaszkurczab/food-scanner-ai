import { describe, expect, it, jest } from "@jest/globals";
import { PieChart } from "@/components/PieChart";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string }) =>
      options?.ns ? `${options.ns}:${key}` : key,
  }),
}));

describe("PieChart", () => {
  it("renders translated macro legend labels", () => {
    const { getByText } = renderWithTheme(
      <PieChart
        data={[
          { value: 30, color: "#0f0", label: "Carbs" },
          { value: 20, color: "#00f", label: "Protein" },
          { value: 10, color: "#f00", label: "Fat" },
        ]}
      />,
    );

    expect(getByText("meals:carbs")).toBeTruthy();
    expect(getByText("meals:protein")).toBeTruthy();
    expect(getByText("meals:fat")).toBeTruthy();
  });

  it("omits zero-value items from legend", () => {
    const { getByText, queryByText } = renderWithTheme(
      <PieChart
        data={[
          { value: 0, color: "#999", label: "Zero" },
          { value: 12, color: "#0f0", label: "Visible" },
        ]}
      />,
    );

    expect(getByText("Visible")).toBeTruthy();
    expect(queryByText("Zero")).toBeNull();
  });

  it("shows no legend when total equals zero", () => {
    const { queryByText } = renderWithTheme(
      <PieChart
        data={[
          { value: 0, color: "#0f0", label: "A" },
          { value: 0, color: "#00f", label: "B" },
        ]}
      />,
    );

    expect(queryByText("A")).toBeNull();
    expect(queryByText("B")).toBeNull();
  });

  it("hides legend when showLegend is false", () => {
    const { queryByText } = renderWithTheme(
      <PieChart
        data={[
          { value: 12, color: "#0f0", label: "Visible" },
          { value: 8, color: "#00f", label: "Second" },
        ]}
        showLegend={false}
      />,
    );

    expect(queryByText("Visible")).toBeNull();
    expect(queryByText("Second")).toBeNull();
  });
});
