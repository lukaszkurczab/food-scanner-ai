import { describe, expect, it, jest } from "@jest/globals";
import { EmptyState } from "@/feature/History/components/EmptyState";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

describe("History EmptyState", () => {
  it("renders title and description", () => {
    const { getByText } = renderWithTheme(
      <EmptyState title="No meals" description="Add your first meal" />,
    );

    expect(getByText("No meals")).toBeTruthy();
    expect(getByText("Add your first meal")).toBeTruthy();
  });

  it("hides description when it is not provided", () => {
    const { getByText, queryByText } = renderWithTheme(
      <EmptyState title="No meals" />,
    );

    expect(getByText("No meals")).toBeTruthy();
    expect(queryByText("Add your first meal")).toBeNull();
  });
});
