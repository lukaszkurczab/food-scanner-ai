import { describe, expect, it } from "@jest/globals";
import { FullScreenLoader } from "@/components/FullScreenLoader";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("FullScreenLoader", () => {
  it("renders with label and testID", () => {
    const { getByText, getByTestId } = renderWithTheme(
      <FullScreenLoader testID="fullscreen-loader" label="Loading meals" />,
    );

    expect(getByTestId("fullscreen-loader")).toBeTruthy();
    expect(getByText("Loading meals")).toBeTruthy();
  });

  it("renders without label", () => {
    const { queryByText } = renderWithTheme(<FullScreenLoader />);
    expect(queryByText("Loading meals")).toBeNull();
  });
});
