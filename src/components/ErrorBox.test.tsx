import { describe, expect, it } from "@jest/globals";
import { ErrorBox } from "@/components/ErrorBox";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("ErrorBox", () => {
  it("renders alert message", () => {
    const { getByText, toJSON } = renderWithTheme(
      <ErrorBox message="Validation failed" />,
    );

    expect(getByText("Validation failed")).toBeTruthy();
    expect(toJSON()).toBeTruthy();
  });

  it("renders nothing when message is empty", () => {
    const { toJSON } = renderWithTheme(<ErrorBox message="" />);
    expect(toJSON()).toBeNull();
  });
});
