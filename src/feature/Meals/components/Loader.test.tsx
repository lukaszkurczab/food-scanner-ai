import { describe, expect, it } from "@jest/globals";
import Loader from "@/feature/Meals/components/Loader";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("Loader", () => {
  it("renders default copy", () => {
    const { getByText } = renderWithTheme(<Loader />);

    expect(getByText("Analyzing your meal...")).toBeTruthy();
    expect(getByText("This may take a few seconds.")).toBeTruthy();
  });

  it("renders custom text and subtext", () => {
    const { getByText, queryByText } = renderWithTheme(
      <Loader text="Loading analysis" subtext="Please wait" size="small" />,
    );

    expect(getByText("Loading analysis")).toBeTruthy();
    expect(getByText("Please wait")).toBeTruthy();
    expect(queryByText("Analyzing your meal...")).toBeNull();
  });
});
