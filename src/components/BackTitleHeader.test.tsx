import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { BackTitleHeader } from "@/components/BackTitleHeader";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? key,
  }),
}));

describe("BackTitleHeader", () => {
  it("renders title and handles back press", () => {
    const onBack = jest.fn();
    const { getByText, getByTestId } = renderWithTheme(
      <BackTitleHeader title="Edit profile" onBack={onBack} />,
    );

    expect(getByText("Edit profile")).toBeTruthy();

    fireEvent.press(getByTestId("back-title-header-back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
