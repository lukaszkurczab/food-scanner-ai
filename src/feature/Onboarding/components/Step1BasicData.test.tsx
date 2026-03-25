import type { ReactNode } from "react";
import { fireEvent } from "@testing-library/react-native";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import Step1BasicData from "@/feature/Onboarding/components/Step1BasicData";
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

type NumberInputProps = {
  accessibilityLabel?: string;
  onChangeText: (value: string) => void;
};

const mockDropdown = jest.fn<(props: DropdownProps) => null>(() => null);
const mockNumberInput = jest.fn<(props: NumberInputProps) => null>(() => null);

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
    NumberInput: (props: NumberInputProps) => {
      mockNumberInput(props);
      return createElement(Text, null, `input:${props.accessibilityLabel ?? ""}`);
    },
  };
});

const buildForm = (overrides?: Partial<FormData>): FormData => ({
  unitsSystem: "metric",
  age: "",
  sex: null,
  height: "",
  heightInch: "",
  weight: "",
  preferences: [],
  activityLevel: "",
  goal: "",
  surveyComplited: false,
  calorieTarget: null,
  ...overrides,
});

describe("Step1BasicData", () => {
  beforeEach(() => {
    mockDropdown.mockClear();
    mockNumberInput.mockClear();
  });

  it("updates units system from dropdown onChange", () => {
    const setForm = jest.fn();
    const initial = buildForm({ unitsSystem: "metric" });

    renderWithTheme(
      <Step1BasicData
        form={initial}
        setForm={setForm}
        errors={{}}
        setErrors={jest.fn()}
        editMode={false}
        onConfirmEdit={jest.fn()}
        onNext={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const dropdownProps = mockDropdown.mock.calls[0][0];
    dropdownProps.onChange("imperial");

    const updater = setForm.mock.calls[0][0] as (prev: FormData) => FormData;
    const updated = updater(initial);
    expect(updated.unitsSystem).toBe("imperial");
  });

  it("converts imperial height and weight input values", () => {
    const setForm = jest.fn();
    const form = buildForm({
      unitsSystem: "imperial",
      age: "30",
      sex: "male",
      height: "170",
      heightInch: "7",
      weight: "70",
    });

    renderWithTheme(
      <Step1BasicData
        form={form}
        setForm={setForm}
        errors={{}}
        setErrors={jest.fn()}
        editMode={false}
        onConfirmEdit={jest.fn()}
        onNext={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    const heightFtInput = mockNumberInput.mock.calls.find(
      ([props]) => props.accessibilityLabel === "heightFt",
    )?.[0];
    const weightInput = mockNumberInput.mock.calls.find(
      ([props]) => props.accessibilityLabel === "weight",
    )?.[0];

    if (!heightFtInput || !weightInput) {
      throw new Error("Missing expected NumberInput props");
    }

    heightFtInput.onChangeText("6");
    weightInput.onChangeText("220");

    const heightUpdater = setForm.mock.calls[0][0] as (prev: FormData) => FormData;
    const weightUpdater = setForm.mock.calls[1][0] as (prev: FormData) => FormData;

    const heightUpdated = heightUpdater(form);
    expect(heightUpdated.height).toBe("201");
    expect(heightUpdated.heightInch).toBe("7");

    const weightUpdated = weightUpdater(form);
    expect(weightUpdated.weight).toBe("100");
  });

  it("blocks next when required fields are invalid", () => {
    const onNext = jest.fn();
    const { getByText } = renderWithTheme(
      <Step1BasicData
        form={buildForm()}
        setForm={jest.fn()}
        errors={{}}
        setErrors={jest.fn()}
        editMode={false}
        onConfirmEdit={jest.fn()}
        onNext={onNext}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(getByText("next"));
    expect(onNext).not.toHaveBeenCalled();
  });

  it("calls confirm action in edit mode", () => {
    const onConfirmEdit = jest.fn();
    const { getByText } = renderWithTheme(
      <Step1BasicData
        form={buildForm({
          unitsSystem: "metric",
          age: "29",
          sex: "female",
          height: "168",
          weight: "62",
        })}
        setForm={jest.fn()}
        errors={{}}
        setErrors={jest.fn()}
        editMode
        onConfirmEdit={onConfirmEdit}
        onNext={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    fireEvent.press(getByText("summary.confirm"));
    expect(onConfirmEdit).toHaveBeenCalledTimes(1);
  });
});
