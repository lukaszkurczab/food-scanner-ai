import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import {
  PrimaryButton,
  SecondaryButton,
  TextInput,
  Dropdown,
} from "@/components";
import { cmToFtIn, ftInToCm, kgToLbs, lbsToKg } from "@/utils/units";
import { UnitsSystem, FormData } from "@/types";

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

  const cm = Number(form.height || 0);
  const kg = Number(form.weight || 0);
  const { ft: dispFt, inch: dispIn } = cm ? cmToFtIn(cm) : { ft: 0, inch: 0 };
  const dispLbs = kg ? kgToLbs(kg) : 0;

  const validate = (
    field: keyof FormData,
    value: string,
  ): string | undefined => {
    switch (field) {
      case "age": {
        if (!value) return t("errors.ageRequired");
        if (!/^\d+$/.test(value) || Number(value) < 16 || Number(value) > 120)
          return t("errors.ageInvalid");
        break;
      }
      case "sex": {
        if (!value) return t("errors.sexRequired");
        break;
      }
      case "height": {
        if (!value && form.unitsSystem === "metric")
          return t("errors.heightRequired");
        if (form.unitsSystem === "metric") {
          if (!/^\d{2,3}$/.test(value)) return t("errors.heightInvalid");
          const v = Number(value);
          if (v < 90 || v > 250) return t("errors.heightInvalid");
        } else {
          if (!/^\d+$/.test(value)) return t("errors.heightInvalid");
          const ft = Number(value);
          if (ft < 3 || ft > 8) return t("errors.heightInvalid");
        }
        break;
      }
      case "heightInch": {
        if (form.unitsSystem === "imperial") {
          if (
            value &&
            (!/^\d+$/.test(value) || Number(value) < 0 || Number(value) > 11)
          )
            return t("errors.heightInchInvalid");
        }
        break;
      }
      case "weight": {
        if (!value && form.unitsSystem === "metric")
          return t("errors.weightRequired");
        if (form.unitsSystem === "metric") {
          if (!/^\d+$/.test(value)) return t("errors.weightInvalid");
          const v = Number(value);
          if (v < 30 || v > 300) return t("errors.weightInvalid");
        } else {
          if (!/^\d+$/.test(value)) return t("errors.weightInvalid");
          const lbs = Number(value);
          if (lbs < 70 || lbs > 660) return t("errors.weightInvalid");
        }
        break;
      }
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

  const handleHeightFtChange = (ftStr: string) => {
    const ft = Number(ftStr.replace(/[^0-9]/g, "")) || 0;
    const inch = Number(getString(form.heightInch)) || 0;
    const toCm = ftInToCm(ft, inch);
    setForm((p) => ({ ...p, height: String(toCm), heightInch: String(inch) }));
    setErrors((e) => ({ ...e, height: undefined }));
  };

  const handleHeightInChange = (inStr: string) => {
    const inch = Number(inStr.replace(/[^0-9]/g, "")) || 0;
    const ft = dispFt || 0;
    const toCm = ftInToCm(ft, inch);
    setForm((p) => ({ ...p, height: String(toCm), heightInch: String(inch) }));
    setErrors((e) => ({ ...e, heightInch: undefined }));
  };

  const handleWeightLbsChange = (lbsStr: string) => {
    const lbs = Number(lbsStr.replace(/[^0-9]/g, "")) || 0;
    const toKg = lbsToKg(lbs);
    setForm((p) => ({ ...p, weight: String(toKg) }));
    setErrors((e) => ({ ...e, weight: undefined }));
  };

  const canNext = () => {
    if (validate("age", getString(form.age))) return false;
    if (validate("sex", getString(form.sex))) return false;
    if (form.unitsSystem === "metric") {
      if (validate("height", getString(form.height))) return false;
      if (validate("weight", getString(form.weight))) return false;
    } else {
      if (validate("height", String(dispFt || ""))) return false;
      if (validate("heightInch", String(dispIn ?? ""))) return false;
      if (validate("weight", String(dispLbs || ""))) return false;
    }
    return true;
  };

  const heightLabel = form.unitsSystem === "metric" ? "cm" : "ft + in";
  const weightLabel = form.unitsSystem === "metric" ? "kg" : "lbs";

  return (
    <View style={styles.container}>
      <View style={{ gap: theme.spacing.lg }}>
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
          label={`${t("age")}*`}
          value={getString(form.age)}
          onChangeText={(val) =>
            handleChange("age", val.replace(/[^0-9]/g, ""))
          }
          keyboardType="number-pad"
          onBlur={() => handleBlur("age")}
          error={errors.age}
          accessibilityLabel={t("age")}
          returnKeyType="next"
        />

        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          {form.sex === "male" ? (
            <>
              <PrimaryButton
                label={t("male")}
                onPress={() => handleChange("sex", "male")}
                style={{ flex: 1 }}
                textStyle={{ fontSize: theme.typography.size.sm }}
                accessibilityState={{ selected: true }}
              />
              <SecondaryButton
                label={t("female")}
                onPress={() => handleChange("sex", "female")}
                style={{ flex: 1 }}
                textStyle={{ fontSize: theme.typography.size.sm }}
                accessibilityState={{ selected: false }}
              />
            </>
          ) : (
            <>
              <SecondaryButton
                label={t("male")}
                onPress={() => handleChange("sex", "male")}
                style={{ flex: 1 }}
                textStyle={{ fontSize: theme.typography.size.sm }}
                accessibilityState={{ selected: false }}
              />
              <PrimaryButton
                label={t("female")}
                onPress={() => handleChange("sex", "female")}
                style={{ flex: 1 }}
                textStyle={{ fontSize: theme.typography.size.sm }}
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
            label={`${t("height")}*`}
            value={getString(form.height)}
            onChangeText={(val) =>
              setForm((p) => ({ ...p, height: val.replace(/[^0-9]/g, "") }))
            }
            keyboardType="number-pad"
            onBlur={() => handleBlur("height")}
            error={errors.height}
            rightLabel={heightLabel}
            accessibilityLabel={t("height")}
            returnKeyType="next"
          />
        ) : (
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <TextInput
              label={`${t("heightFt")}*`}
              value={dispFt ? String(dispFt) : ""}
              onChangeText={handleHeightFtChange}
              keyboardType="number-pad"
              onBlur={() => handleBlur("height")}
              error={errors.height}
              rightLabel="ft"
              accessibilityLabel={t("heightFt")}
              style={styles.flex1}
            />
            <TextInput
              label={`${t("heightIn")}*`}
              value={String(dispIn ?? 0)}
              onChangeText={handleHeightInChange}
              keyboardType="number-pad"
              onBlur={() => handleBlur("heightInch")}
              error={errors.heightInch}
              rightLabel="in"
              accessibilityLabel={t("heightIn")}
              style={styles.flex1}
            />
          </View>
        )}

        <TextInput
          label={`${t("weight")}*`}
          value={
            form.unitsSystem === "metric"
              ? getString(form.weight)
              : String(dispLbs || "")
          }
          onChangeText={
            form.unitsSystem === "metric"
              ? (val) => {
                  setForm((p) => ({
                    ...p,
                    weight: val.replace(/[^0-9]/g, ""),
                  }));
                  setErrors((e) => ({ ...e, weight: undefined }));
                }
              : handleWeightLbsChange
          }
          keyboardType="number-pad"
          onBlur={() => handleBlur("weight")}
          error={errors.weight}
          rightLabel={weightLabel}
          accessibilityLabel={t("weight")}
        />
      </View>
      <View style={{ gap: theme.spacing.lg }}>
        <PrimaryButton
          label={editMode ? t("summary.confirm", "Confirm") : t("next")}
          onPress={editMode ? onConfirmEdit : onNext}
          disabled={!canNext()}
        />
        <SecondaryButton label={t("cancel")} onPress={onCancel} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "space-between",
  },
  column: { flexDirection: "column" },
  row: { flexDirection: "row" },
  flex1: { flex: 1 },
});
