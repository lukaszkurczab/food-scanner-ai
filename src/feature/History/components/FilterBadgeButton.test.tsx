import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { FilterBadgeButton } from "@/feature/History/components/FilterBadgeButton";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("FilterBadgeButton", () => {
  it("renders translated label and handles press", () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(
      <FilterBadgeButton onPress={onPress} />,
    );

    fireEvent.press(getByText("translated:filters"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders badge only when activeCount is greater than zero", () => {
    const { queryByText, rerender } = renderWithTheme(
      <FilterBadgeButton onPress={() => undefined} activeCount={0} />,
    );

    expect(queryByText("2")).toBeNull();

    rerender(<FilterBadgeButton onPress={() => undefined} activeCount={2} />);
    expect(queryByText("2")).toBeTruthy();
  });
});
