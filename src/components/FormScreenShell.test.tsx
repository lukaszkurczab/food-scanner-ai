import { Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { FormScreenShell } from "@/components/FormScreenShell";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: ({ name }: { name: string }) => {
    const { Text: MockText } = require("react-native");
    return <MockText>{name}</MockText>;
  },
}));

jest.mock("@/components/Layout", () => ({
  __esModule: true,
  Layout: ({ children }: { children: unknown }) => children,
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

describe("FormScreenShell", () => {
  it("renders header, intro copy, children, and sticky actions", () => {
    const onBack = jest.fn();
    const onSave = jest.fn();
    const { getByText } = renderWithTheme(
      <FormScreenShell
        title="Change email"
        onBack={onBack}
        intro="Update the address linked to your account."
        actionLabel="Save"
        onActionPress={onSave}
      >
        <Text>Email field</Text>
      </FormScreenShell>,
    );

    expect(getByText("Change email")).toBeTruthy();
    expect(getByText("Update the address linked to your account.")).toBeTruthy();
    expect(getByText("Email field")).toBeTruthy();

    fireEvent.press(getByText("arrow-left"));
    fireEvent.press(getByText("Save"));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });
});
