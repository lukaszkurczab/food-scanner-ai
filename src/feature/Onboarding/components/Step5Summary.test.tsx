import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest } from "@jest/globals";
import Step5Summary from "@/feature/Onboarding/components/Step5Summary";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { FormData } from "@/types";

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  variant?: string;
  children?: ReactNode;
};

type IconButtonProps = {
  onPress: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
};

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components/AppIcon", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    Button: ({ label, onPress, disabled, testID }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, testID, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
    IconButton: ({ onPress, accessibilityLabel }: IconButtonProps) =>
      createElement(
        Pressable,
        { onPress, accessibilityRole: "button", accessibilityLabel },
        createElement(Text, null, accessibilityLabel),
      ),
  };
});

const buildForm = (overrides?: Partial<FormData>): FormData => ({
  unitsSystem: "metric",
  age: "30",
  sex: "male",
  height: "180",
  weight: "70",
  preferences: ["keto", "vegan"],
  activityLevel: "moderate",
  goal: "lose",
  calorieDeficit: 0.15,
  chronicDiseases: ["other"],
  chronicDiseasesOther: "thyroid",
  allergies: ["other"],
  allergiesOther: "sesame",
  lifestyle: "office",
  aiStyle: "friendly",
  aiFocus: "other",
  aiFocusOther: "custom focus",
  aiNote: "note",
  surveyComplited: false,
  calorieTarget: null,
  ...overrides,
});

describe("Step5Summary", () => {
  it("renders summary content and handles finish/back actions", () => {
    const onFinish = jest.fn();
    const onBack = jest.fn();
    const { getByText } = renderWithTheme(
      <Step5Summary
        form={buildForm()}
        goToStep={() => undefined}
        onFinish={onFinish}
        onBack={onBack}
      />,
    );

    expect(getByText("summary.title")).toBeTruthy();
    expect(getByText("summary.personalInfo")).toBeTruthy();
    expect(getByText("180 cm")).toBeTruthy();
    expect(getByText("70 kg")).toBeTruthy();
    expect(getByText("preferences.keto, preferences.vegan")).toBeTruthy();

    fireEvent.press(getByText("summary.save"));
    fireEvent.press(getByText("back"));
    expect(onFinish).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("routes edit buttons to proper onboarding steps", () => {
    const goToStep = jest.fn();
    const { getAllByLabelText } = renderWithTheme(
      <Step5Summary
        form={buildForm()}
        goToStep={goToStep}
        onFinish={() => undefined}
        onBack={() => undefined}
      />,
    );

    const editButtons = getAllByLabelText("summary.edit");
    fireEvent.press(editButtons[0]);
    fireEvent.press(editButtons[1]);
    fireEvent.press(editButtons[2]);
    fireEvent.press(editButtons[3]);

    expect(goToStep).toHaveBeenCalledTimes(4);
    expect(goToStep.mock.calls.map((call) => call[0])).toEqual([1, 2, 3, 4]);
  });

  it("renders imperial units when selected", () => {
    const { getByText } = renderWithTheme(
      <Step5Summary
        form={buildForm({ unitsSystem: "imperial", height: "180", weight: "70" })}
        goToStep={() => undefined}
        onFinish={() => undefined}
        onBack={() => undefined}
      />,
    );

    expect(getByText("5 ft 11 in")).toBeTruthy();
    expect(getByText("154 lbs")).toBeTruthy();
  });
});
