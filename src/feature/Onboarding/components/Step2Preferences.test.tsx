import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Step2Preferences from "@/feature/Onboarding/components/Step2Preferences";
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

type DropdownProps = {
  label?: string;
  value: string | null;
  options: Array<{ label: string; value: string | null }>;
  onChange: (value: string | null) => void;
};

type CheckboxDropdownProps = {
  label?: string;
  values: string[];
  onChange: (values: string[]) => void;
  disabledValues?: string[];
};

type SliderProps = {
  value: number;
  onValueChange: (value: number) => void;
};

const mockDropdown = jest.fn<(props: DropdownProps) => null>(() => null);
const mockCheckboxDropdown = jest.fn<(props: CheckboxDropdownProps) => null>(() => null);
const mockSlider = jest.fn<(props: SliderProps) => null>(() => null);

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { ns?: string }) =>
      options?.ns ? `${options.ns}:${key}` : key,
  }),
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
    Dropdown: (props: DropdownProps) => {
      mockDropdown(props);
      return createElement(Text, null, `dropdown:${props.label}`);
    },
    CheckboxDropdown: (props: CheckboxDropdownProps) => {
      mockCheckboxDropdown(props);
      return createElement(Text, null, `checkbox:${props.label}`);
    },
    Slider: (props: SliderProps) => {
      mockSlider(props);
      return createElement(Text, null, "slider");
    },
  };
});

const buildForm = (overrides?: Partial<FormData>): FormData => ({
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
  ...overrides,
});

describe("Step2Preferences", () => {
  beforeEach(() => {
    mockDropdown.mockClear();
    mockCheckboxDropdown.mockClear();
    mockSlider.mockClear();
  });

  it("blocks next action when required fields are missing", () => {
    const onNext = jest.fn();
    const setErrors = jest.fn();
    const { getByText } = renderWithTheme(
      <Step2Preferences
        form={buildForm()}
        setForm={jest.fn()}
        errors={{}}
        setErrors={setErrors}
        editMode={false}
        onConfirmEdit={jest.fn()}
        onNext={onNext}
        onBack={jest.fn()}
      />,
    );

    fireEvent.press(getByText("next"));
    expect(onNext).not.toHaveBeenCalled();
  });

  it("calls confirm callback in edit mode", () => {
    const onConfirmEdit = jest.fn();
    const { getByText } = renderWithTheme(
      <Step2Preferences
        form={buildForm({ activityLevel: "light", goal: "maintain" })}
        setForm={jest.fn()}
        errors={{}}
        setErrors={jest.fn()}
        editMode
        onConfirmEdit={onConfirmEdit}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    fireEvent.press(getByText("summary.save"));
    expect(onConfirmEdit).toHaveBeenCalledTimes(1);
  });

  it("updates goal defaults via goal dropdown handler", () => {
    const setForm = jest.fn();
    renderWithTheme(
      <Step2Preferences
        form={buildForm({ activityLevel: "moderate", goal: "" })}
        setForm={setForm}
        errors={{}}
        setErrors={jest.fn()}
        editMode={false}
        onConfirmEdit={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    const goalDropdown = mockDropdown.mock.calls[1][0];
    goalDropdown.onChange("lose");

    const updater = setForm.mock.calls[0][0] as (prev: FormData) => FormData;
    const updated = updater(buildForm({ goal: "", calorieDeficit: undefined }));

    expect(updated.goal).toBe("lose");
    expect(updated.calorieDeficit).toBe(0.2);
    expect(updated.calorieSurplus).toBe(0.2);
  });

  it("computes disabled preference conflicts for selected preference", () => {
    renderWithTheme(
      <Step2Preferences
        form={buildForm({ preferences: ["keto"], activityLevel: "light", goal: "maintain" })}
        setForm={jest.fn()}
        errors={{}}
        setErrors={jest.fn()}
        editMode={false}
        onConfirmEdit={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    const checkboxProps = mockCheckboxDropdown.mock.calls[0][0];
    expect(checkboxProps.disabledValues).toEqual(
      expect.arrayContaining(["highCarb", "balanced", "lowFat", "lowCarb"]),
    );
  });
});
