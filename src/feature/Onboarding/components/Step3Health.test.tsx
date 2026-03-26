import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Step3Health from "@/feature/Onboarding/components/Step3Health";
import { renderWithTheme } from "@/test-utils/renderWithTheme";
import type { FormData } from "@/types";

type CheckboxDropdownProps<T extends string | number> = {
  label?: string;
  values: T[];
  onChange: (values: T[]) => void;
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

const mockCheckboxDropdown = jest.fn<
  (props: CheckboxDropdownProps<string | number>) => null
>(() => null);

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
    CheckboxDropdown: <T extends string | number>(props: CheckboxDropdownProps<T>) => {
      mockCheckboxDropdown(props as unknown as CheckboxDropdownProps<string | number>);
      return createElement(Text, null, `checkbox-dropdown:${props.label}`);
    },
    TextInput: ({ placeholder }: TextInputProps) =>
      createElement(Text, null, placeholder),
    LongTextInput: ({ placeholder }: TextInputProps) =>
      createElement(Text, null, placeholder),
    Button: ({ label, onPress, disabled, testID }: ButtonProps) =>
      createElement(
        Pressable,
        { onPress, disabled, testID, accessibilityRole: "button" },
        createElement(Text, null, label),
      ),
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
  chronicDiseases: [],
  allergies: [],
  lifestyle: "",
  surveyComplited: false,
  calorieTarget: null,
  ...overrides,
});

describe("Step3Health", () => {
  beforeEach(() => {
    mockCheckboxDropdown.mockClear();
  });

  it("validates missing 'other' details before proceeding", () => {
    const onNext = jest.fn();
    const setErrors = jest.fn();
    const { getByText } = renderWithTheme(
      <Step3Health
        form={buildForm({
          chronicDiseases: ["other"],
          allergies: ["other"],
          chronicDiseasesOther: "",
          allergiesOther: "",
        })}
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
    expect(setErrors).toHaveBeenCalledWith({
      chronicDiseasesOther: "validation.otherRequired",
      allergiesOther: "validation.otherRequired",
    });
  });

  it("uses confirm callback in edit mode", () => {
    const onConfirmEdit = jest.fn();
    const { getByText } = renderWithTheme(
      <Step3Health
        form={buildForm()}
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

  it("updates chronic disease selection via setForm updater", () => {
    const setForm = jest.fn();
    renderWithTheme(
      <Step3Health
        form={buildForm({ chronicDiseases: [], chronicDiseasesOther: "" })}
        setForm={setForm}
        errors={{}}
        setErrors={jest.fn()}
        editMode={false}
        onConfirmEdit={jest.fn()}
        onNext={jest.fn()}
        onBack={jest.fn()}
      />,
    );

    const chronicDropdownProps = mockCheckboxDropdown.mock.calls[0][0] as CheckboxDropdownProps<string>;
    chronicDropdownProps.onChange(["other"]);

    const updater = setForm.mock.calls[0][0] as (prev: FormData) => FormData;
    const updated = updater(
      buildForm({
        chronicDiseases: [],
        chronicDiseasesOther: "",
      }),
    );

    expect(updated.chronicDiseases).toEqual(["other"]);
    expect(updated.chronicDiseasesOther).toBe("");
  });
});
