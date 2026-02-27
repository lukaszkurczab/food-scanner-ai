import type { ReactNode } from "react";
import { describe, expect, it, jest, beforeAll, afterAll } from "@jest/globals";
import GaugeMacroChart from "@/feature/Meals/components/chartLayouts/GaugeMacroChart";
import { renderWithTheme } from "@/test-utils/renderWithTheme";

jest.mock("react-native-reanimated", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { View } =
    jest.requireActual<typeof import("react-native")>("react-native");

  const AnimatedView = ({
    children,
    ...props
  }: {
    children?: ReactNode;
    [key: string]: unknown;
  }) => createElement(View, props, children);

  return {
    __esModule: true,
    default: { View: AnimatedView },
    View: AnimatedView,
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (updater: () => Record<string, unknown>) => updater(),
    withTiming: (value: number) => value,
    runOnJS: (fn: (...args: unknown[]) => void) => fn,
    useAnimatedGestureHandler: () => () => undefined,
    getUseOfValueInStyleWarning: () => "",
  };
});

describe("GaugeMacroChart", () => {
  let warnSpy: jest.SpiedFunction<typeof console.warn>;

  beforeAll(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterAll(() => {
    warnSpy.mockRestore();
  });

  it("hides kcal label when showLabel is false", () => {
    const { queryByText } = renderWithTheme(
      <GaugeMacroChart
        data={[
          { value: 12, color: "#00f", label: "protein" },
          { value: 20, color: "#0f0", label: "carbs" },
          { value: 8, color: "#f00", label: "fat" },
        ]}
        kcal={300}
        showLabel={false}
      />,
    );

    expect(queryByText("300 kcal")).toBeNull();
  });
});
