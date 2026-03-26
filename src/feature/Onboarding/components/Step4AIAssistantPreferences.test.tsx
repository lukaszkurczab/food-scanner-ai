import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Step4AIAssistantPreferences from "@/feature/Onboarding/components/Step4AIAssistantPreferences";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { FormData } from "@/types";

type DropdownProps = {
  label?: string;
  value: string | null;
  options: Array<{ label: string; value: string | null }>;
  onChange: (value: string | null) => void;
};

type TextInputProps = {
  placeholder?: string;
  value: string;
  onChangeText: (value: string) => void;
};

type ButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
  variant?: string;
  children?: ReactNode;
};

const mockDropdown = jest.fn<(props: DropdownProps) => null>(() => null);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock("@/components", () => {
  const { createElement } =
    jest.requireActual<typeof import("react")>("react");
  const { Pressable, Text } =
    jest.requireActual<typeof import("react-native")>("react-native");

  return {
    __esModule: true,
    Dropdown: (props: DropdownProps) => {
      mockDropdown(props);
      return createElement(Text, null, `dropdown:${props.label}`);
    },
    TextInput: ({ placeholder }: TextInputProps) =>
      createElement(Text, null, placeholder),
    Button: ({ label, onPress, disabled, testID }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, testID, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
  };
});

const createBaseProps = (formOverrides: Partial<FormData>) => {
  const setForm = jest.fn();
  const setErrors = jest.fn();
  const onConfirmEdit = jest.fn();
  const onNext = jest.fn();
  const onBack = jest.fn();
  const form: FormData = {
    unitsSystem: "metric",
    age: "",
    sex: null,
    height: "",
    weight: "",
    preferences: [],
    activityLevel: "",
    goal: "",
    surveyComplited: false,
    calorieTarget: null,
    ...formOverrides,
  };

  return {
    props: {
      form,
      setForm,
      errors: {},
      setErrors,
      editMode: false,
      onConfirmEdit,
      onNext,
      onBack,
    },
    setForm,
    onConfirmEdit,
    onNext,
    onBack,
  };
};

describe("Step4AIAssistantPreferences", () => {
  beforeEach(() => {
    mockDropdown.mockClear();
  });

  it("shows custom focus input and disables primary action when empty", () => {
    const { props, onNext } = createBaseProps({
      aiStyle: "none",
      aiFocus: "other",
      aiFocusOther: "",
    });
    const { getByText } = renderWithTheme(
      <Step4AIAssistantPreferences {...props} />,
    );

    expect(getByText("ai.focus_placeholder")).toBeTruthy();
    fireEvent.press(getByText("next"));
    expect(onNext).not.toHaveBeenCalled();
  });

  it("routes primary action to confirm callback in edit mode", () => {
    const base = createBaseProps({
      aiStyle: "concise",
      aiFocus: "none",
      aiFocusOther: "",
    });
    const { getByText } = renderWithTheme(
      <Step4AIAssistantPreferences
        {...base.props}
        editMode
      />,
    );

    fireEvent.press(getByText("summary.save"));
    expect(base.onConfirmEdit).toHaveBeenCalledTimes(1);
    expect(base.onNext).not.toHaveBeenCalled();
  });

  it("updates focus and resets aiFocusOther through dropdown updater", () => {
    const base = createBaseProps({
      aiStyle: "none",
      aiFocus: "mealPlanning",
      aiFocusOther: "keep",
    });
    renderWithTheme(<Step4AIAssistantPreferences {...base.props} />);

    const areaOfFocusDropdown = mockDropdown.mock.calls[1][0];
    areaOfFocusDropdown.onChange("other");

    const updater = base.setForm.mock.calls[0][0] as (prev: FormData) => FormData;
    const updated = updater({
      unitsSystem: "metric",
      age: "",
      sex: null,
      height: "",
      weight: "",
      preferences: [],
      activityLevel: "",
      goal: "",
      surveyComplited: false,
      calorieTarget: null,
      aiStyle: "none",
      aiFocus: "mealPlanning",
      aiFocusOther: "keep",
    });

    expect(updated.aiFocus).toBe("other");
    expect(updated.aiFocusOther).toBe("keep");
  });
});
