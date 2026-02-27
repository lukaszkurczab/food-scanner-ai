import { describe, expect, it, jest } from "@jest/globals";
import { EmptyState } from "@/feature/Meals/components/EmptyState";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@expo/vector-icons", () => ({
  MaterialIcons: () => null,
}));

describe("Meals EmptyState", () => {
  it("renders title and description", () => {
    const { getByText } = renderWithTheme(
      <EmptyState title="No meals" description="Add your first meal" />,
    );

    expect(getByText("No meals")).toBeTruthy();
    expect(getByText("Add your first meal")).toBeTruthy();
  });

  it("hides description when missing", () => {
    const { getByText, queryByText } = renderWithTheme(
      <EmptyState title="No meals" />,
    );

    expect(getByText("No meals")).toBeTruthy();
    expect(queryByText("Add your first meal")).toBeNull();
  });
});
