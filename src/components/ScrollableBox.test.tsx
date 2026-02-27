import { ScrollView as RNScrollView, Text } from "react-native";
import { describe, expect, it, jest } from "@jest/globals";
import { ScrollableBox } from "@/components/ScrollableBox";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-native-gesture-handler", () => {
  const { ScrollView } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return { __esModule: true, ScrollView };
});

describe("ScrollableBox", () => {
  it("renders children inside a configured scroll view", () => {
    const { getByText, UNSAFE_getByType } = renderWithTheme(
      <ScrollableBox contentContainerStyle={{ paddingBottom: 24 }}>
        <Text>inside-scrollable-box</Text>
      </ScrollableBox>,
    );

    const scrollView = UNSAFE_getByType(RNScrollView);
    expect(getByText("inside-scrollable-box")).toBeTruthy();
    expect(scrollView.props.nestedScrollEnabled).toBe(true);
    expect(scrollView.props.keyboardShouldPersistTaps).toBe("handled");
    expect(scrollView.props.contentContainerStyle).toEqual([
      { paddingHorizontal: 8 },
      { paddingBottom: 24 },
    ]);
  });
});
