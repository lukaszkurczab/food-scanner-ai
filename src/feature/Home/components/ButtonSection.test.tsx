import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { ButtonSection } from "@/feature/Home/components/ButtonSection";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

const mockNavigate = jest.fn();

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => `translated:${key}`,
  }),
}));

describe("ButtonSection", () => {
  it("navigates to saved meals", () => {
    const { getByText } = renderWithTheme(<ButtonSection />);

    fireEvent.press(getByText("translated:savedMeals"));
    expect(mockNavigate).toHaveBeenCalledWith("SavedMeals");
  });
});
