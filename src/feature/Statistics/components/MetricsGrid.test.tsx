import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import {
  MetricsGrid,
  type MetricKey,
} from "@/feature/Statistics/components/MetricsGrid";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      if (key === "common:kcal") return "kcal";
      if (key === "common:gram") return "g";
      return key;
    },
  }),
}));

describe("MetricsGrid", () => {
  it("renders metric values and calls onSelect", () => {
    const onSelect = jest.fn<(value: MetricKey) => void>();
    const { getByText } = renderWithTheme(
      <MetricsGrid
        values={{ kcal: 1234.6, protein: 99.4, carbs: 201.5, fat: 45.2 }}
        selected="kcal"
        onSelect={onSelect}
      />,
    );

    expect(getByText("1235 kcal")).toBeTruthy();
    expect(getByText("99 g")).toBeTruthy();
    expect(getByText("202 g")).toBeTruthy();
    expect(getByText("45 g")).toBeTruthy();

    fireEvent.press(getByText("statistics:tiles.fat"));
    expect(onSelect).toHaveBeenCalledWith("fat");
  });
});
