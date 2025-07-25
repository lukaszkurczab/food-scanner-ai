import React, { useEffect } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import {
  PrimaryButton,
  SecondaryButton,
  TextInput,
  Dropdown,
} from "@/src/components";
import { convertHeight, convertWeight } from "@/src/utils/units";
import { UnitsSystem, FormData } from "@types/onboarding";

type Props = {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Partial<Record<keyof FormData, string>>;
  setErrors: React.Dispatch<
    React.SetStateAction<Partial<Record<keyof FormData, string>>>
  >;
  editMode: boolean;
  onConfirmEdit: () => void;
  onNext: () => void;
  onCancel: () => void;
};

function getString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  return "";
}

export default function Step1BasicData({
  form,
  setForm,
  errors,
  setErrors,
  editMode,
  onConfirmEdit,
  onNext,
  onCancel,
}: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();

  useEffect(() => {
    if (form.unitsSystem === "imperial" && form.height && !form.heightInch) {
      const { ft, inch } = convertHeight(
        "cmToImperial",
        Number(form.height)
      ) as { ft: number; inch: number };
      setForm((prev) => ({
        ...prev,
        height: ft.toString(),
        heightInch: inch.toString(),
        weight: prev.weight
          ? convertWeight("kgToLbs", Number(prev.weight)).toString()
          : "",
      }));
    } else if (
      form.unitsSystem === "metric" &&
      form.height &&
      form.heightInch
    ) {
      const cm = convertHeight(
        "imperialToCm",
        Number(form.height),
        Number(form.heightInch)
      ) as number;
      setForm((prev) => ({
        ...prev,
        height: cm.toString(),
        heightInch: undefined,
        weight: prev.weight
          ? convertWeight("lbsToKg", Number(prev.weight)).toString()
          : "",
      }));
    }
  }, [form.unitsSystem]);

  const validate = (
    field: keyof FormData,
    value: string
  ): string | undefined => {
    switch (field) {
      case "age":
        if (!value) return t("errors.ageRequired");
        if (!/^\d+$/.test(value) || Number(value) < 16 || Number(value) > 120)
          return t("errors.ageInvalid");
        break;
      case "sex":
        if (!value) return t("errors.sexRequired");
        break;
      case "height":
        if (!value) return t("errors.heightRequired");
        if (form.unitsSystem === "metric") {
          if (
            !/^\d{2,3}$/.test(value) ||
            Number(value) < 90 ||
            Number(value) > 250
          )
            return t("errors.heightInvalid");
        } else {
          if (!/^\d+$/.test(value) || Number(value) < 3 || Number(value) > 8)
            return t("errors.heightInvalid");
        }
        break;
      case "heightInch":
        if (form.unitsSystem === "imperial") {
          if (
            value &&
            (!/^\d+$/.test(value) || Number(value) < 0 || Number(value) > 11)
          )
            return t("errors.heightInchInvalid");
        }
        break;
      case "weight":
        if (!value) return t("errors.weightRequired");
        if (form.unitsSystem === "metric") {
          if (!/^\d+$/.test(value) || Number(value) < 30 || Number(value) > 300)
            return t("errors.weightInvalid");
        } else {
          if (!/^\d+$/.test(value) || Number(value) < 70 || Number(value) > 660)
            return t("errors.weightInvalid");
        }
        break;
      default:
        break;
    }
  };

  const handleBlur = (field: keyof FormData) => {
    const error = validate(field, getString(form[field]));
    setErrors((prev) => ({ ...prev, [field]: error }));
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const canNext = () => {
    if (validate("age", getString(form.age))) return false;
    if (validate("sex", getString(form.sex))) return false;
    if (validate("height", getString(form.height))) return false;
    if (
      form.unitsSystem === "imperial" &&
      validate("heightInch", getString(form.heightInch))
    )
      return false;
    if (validate("weight", getString(form.weight))) return false;
    return true;
  };

  const heightLabel = form.unitsSystem === "metric" ? "cm" : "ft + in";
  const weightLabel = form.unitsSystem === "metric" ? "kg" : "lbs";

  return (
    <View style={{ gap: theme.spacing.md, flexDirection: "column" }}>
      <View>
        <Text
          style={{
            fontSize: theme.typography.size.xl,
            fontFamily: theme.typography.fontFamily.bold,
            color: theme.text,
            textAlign: "center",
            marginBottom: theme.spacing.sm,
          }}
        >
          {t("step1_title")}
        </Text>
        <Text
          style={{
            fontSize: theme.typography.size.base,
            color: theme.textSecondary,
            textAlign: "center",
          }}
        >
          {t("step1_description")}
        </Text>
      </View>

      <Dropdown
        label={t("unitsSystem")}
        value={form.unitsSystem}
        options={[
          { label: t("metric"), value: "metric" },
          { label: t("imperial"), value: "imperial" },
        ]}
        onChange={(val) =>
          setForm((prev) => ({ ...prev, unitsSystem: val as UnitsSystem }))
        }
      />

      <TextInput
        label={t("age")}
        value={getString(form.age)}
        onChangeText={(val) => handleChange("age", val.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        onBlur={() => handleBlur("age")}
        error={errors.age}
        accessibilityLabel={t("age")}
        returnKeyType="next"
      />

      <View
        style={{
          flexDirection: "row",
          gap: theme.spacing.sm,
        }}
      >
        {form.sex === "male" ? (
          <>
            <PrimaryButton
              label={t("male")}
              onPress={() => handleChange("sex", "male")}
              style={{ flex: 1 }}
              accessibilityState={{ selected: true }}
            />
            <SecondaryButton
              label={t("female")}
              onPress={() => handleChange("sex", "female")}
              style={{ flex: 1 }}
              accessibilityState={{ selected: false }}
            />
          </>
        ) : (
          <>
            <SecondaryButton
              label={t("male")}
              onPress={() => handleChange("sex", "male")}
              style={{ flex: 1 }}
              accessibilityState={{ selected: false }}
            />
            <PrimaryButton
              label={t("female")}
              onPress={() => handleChange("sex", "female")}
              style={{ flex: 1 }}
              accessibilityState={{ selected: true }}
            />
          </>
        )}
      </View>
      {errors.sex && (
        <Text
          style={{
            color: theme.error.text,
            fontSize: theme.typography.size.sm,
            textAlign: "center",
          }}
        >
          {errors.sex}
        </Text>
      )}

      {form.unitsSystem === "metric" ? (
        <TextInput
          label={t("height")}
          value={getString(form.height)}
          onChangeText={(val) =>
            handleChange("height", val.replace(/[^0-9]/g, ""))
          }
          keyboardType="number-pad"
          onBlur={() => handleBlur("height")}
          error={errors.height}
          rightLabel={heightLabel}
          accessibilityLabel={t("height")}
          returnKeyType="next"
        />
      ) : (
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          <TextInput
            label={t("heightFt")}
            value={getString(form.height)}
            onChangeText={(val) =>
              handleChange("height", val.replace(/[^0-9]/g, ""))
            }
            keyboardType="number-pad"
            onBlur={() => handleBlur("height")}
            error={errors.height}
            rightLabel="ft"
            accessibilityLabel={t("heightFt")}
            style={{ flex: 1 }}
          />
          <TextInput
            label={t("heightIn")}
            value={getString(form.heightInch)}
            onChangeText={(val) =>
              handleChange("heightInch", val.replace(/[^0-9]/g, ""))
            }
            keyboardType="number-pad"
            onBlur={() => handleBlur("heightInch")}
            error={errors.heightInch}
            rightLabel="in"
            accessibilityLabel={t("heightIn")}
            style={{ flex: 1 }}
          />
        </View>
      )}

      <TextInput
        label={t("weight")}
        value={getString(form.weight)}
        onChangeText={(val) =>
          handleChange("weight", val.replace(/[^0-9]/g, ""))
        }
        keyboardType="number-pad"
        onBlur={() => handleBlur("weight")}
        error={errors.weight}
        rightLabel={weightLabel}
        accessibilityLabel={t("weight")}
      />

      <PrimaryButton
        label={editMode ? t("summary.confirm", "Confirm") : t("next")}
        onPress={editMode ? onConfirmEdit : onNext}
        disabled={!canNext()}
      />
      <SecondaryButton label={t("cancel")} onPress={onCancel} />
    </View>
  );
}
