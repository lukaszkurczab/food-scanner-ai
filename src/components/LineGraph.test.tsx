import { View } from "react-native";
import { Rect, Text as SvgText } from "react-native-svg";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it } from "@jest/globals";
import { LineGraph } from "@/components/LineGraph";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

describe("LineGraph", () => {
  it("renders title and labels after layout", () => {
    const { getByText, UNSAFE_getAllByType } = renderWithTheme(
      <LineGraph
        title="Weekly kcal"
        data={[10, 20, 15]}
        labels={["Mon", "Tue", "Wed"]}
      />,
    );

    fireEvent(UNSAFE_getAllByType(View)[0], "layout", {
      nativeEvent: { layout: { width: 320 } },
    });

    expect(getByText("Weekly kcal")).toBeTruthy();
    const hitTargets = UNSAFE_getAllByType(Rect).filter((node) =>
      Boolean(node.props.onPress),
    );
    expect(hitTargets).toHaveLength(3);
  });

  it("toggles active point value on press", () => {
    const { UNSAFE_getAllByType } = renderWithTheme(
      <LineGraph
        data={[12, 25, 18]}
        labels={["A", "B", "C"]}
        smooth={false}
      />,
    );

    fireEvent(UNSAFE_getAllByType(View)[0], "layout", {
      nativeEvent: { layout: { width: 280 } },
    });

    const hitTargets = UNSAFE_getAllByType(Rect).filter((node) =>
      Boolean(node.props.onPress),
    );

    const getActiveLabels = () =>
      UNSAFE_getAllByType(SvgText).filter(
        (node) => node.props.fontWeight === "700",
      );

    expect(getActiveLabels()).toHaveLength(0);
    fireEvent.press(hitTargets[0]);
    expect(getActiveLabels()).toHaveLength(1);

    fireEvent.press(hitTargets[0]);
    expect(getActiveLabels()).toHaveLength(0);
  });

  it("handles empty data by rendering fallback point", () => {
    const { UNSAFE_getAllByType } = renderWithTheme(
      <LineGraph
        data={[]}
        labels={["Only"]}
      />,
    );

    fireEvent(UNSAFE_getAllByType(View)[0], "layout", {
      nativeEvent: { layout: { width: 240 } },
    });

    const hitTargets = UNSAFE_getAllByType(Rect).filter((node) =>
      Boolean(node.props.onPress),
    );
    expect(hitTargets).toHaveLength(1);
  });
});
