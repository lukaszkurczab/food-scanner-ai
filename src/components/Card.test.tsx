import { Text } from "react-native";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { Card } from "@/components/Card";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("Card", () => {
  it("renders children without press handler", () => {
    const { getByText } = renderWithTheme(
      <Card>
        <Text>Body content</Text>
      </Card>,
    );
    expect(getByText("Body content")).toBeTruthy();
  });

  it("handles press when onPress is provided", () => {
    const onPress = jest.fn();
    const { getByText } = renderWithTheme(
      <Card onPress={onPress}>
        <Text>Tap me</Text>
      </Card>,
    );

    fireEvent.press(getByText("Tap me"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("renders outlined variant", () => {
    const { getByText } = renderWithTheme(
      <Card variant="outlined">
        <Text>Outlined</Text>
      </Card>,
    );
    expect(getByText("Outlined")).toBeTruthy();
  });
});
