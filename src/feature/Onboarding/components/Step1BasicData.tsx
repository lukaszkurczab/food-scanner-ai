import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import {
  NumberInput,
  PrimaryButton,
  SecondaryButton,
  Dropdown,
} from "@/components";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";
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
  const styles = useMemo(() => makeStyles(theme), [theme]);

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
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionGap}>
          <View>
            <Text style={styles.title}>{t("step1_title")}</Text>
            <Text style={styles.subtitle}>{t("step1_description")}</Text>
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

          <NumberInput
            label={`${t("age")}*`}
            value={getString(form.age)}
            onChangeText={(val) => handleChange("age", val)}
            maxDecimals={0}
            allowEmptyOnBlur
            keyboardType="number-pad"
            onBlur={() => handleBlur("age")}
            error={errors.age}
            accessibilityLabel={t("age")}
          />

          <View style={[styles.row, styles.rowGap]}>
            {form.sex === "male" ? (
              <>
                <PrimaryButton
                  label={t("male")}
                  onPress={() => handleChange("sex", "male")}
                  style={styles.flex1}
                  textStyle={styles.buttonText}
                  accessibilityState={{ selected: true }}
                />
                <SecondaryButton
                  label={t("female")}
                  onPress={() => handleChange("sex", "female")}
                  style={styles.flex1}
                  textStyle={styles.buttonText}
                  accessibilityState={{ selected: false }}
                />
              </>
            ) : (
              <>
                <SecondaryButton
                  label={t("male")}
                  onPress={() => handleChange("sex", "male")}
                  style={styles.flex1}
                  textStyle={styles.buttonText}
                  accessibilityState={{ selected: false }}
                />
                <PrimaryButton
                  label={t("female")}
                  onPress={() => handleChange("sex", "female")}
                  style={styles.flex1}
                  textStyle={styles.buttonText}
                  accessibilityState={{ selected: true }}
                />
              </>
            )}
          </View>
          {errors.sex && (
            <Text style={styles.errorText}>
              {errors.sex}
            </Text>
          )}

          {form.unitsSystem === "metric" ? (
            <NumberInput
              label={`${t("height")}*`}
              value={getString(form.height)}
              onChangeText={(val) => setForm((p) => ({ ...p, height: val }))}
              maxDecimals={0}
              allowEmptyOnBlur
              keyboardType="number-pad"
              onBlur={() => handleBlur("height")}
              error={errors.height}
              rightLabel={heightLabel}
              accessibilityLabel={t("height")}
            />
          ) : (
            <View style={[styles.row, styles.rowGap]}>
              <NumberInput
                label={`${t("heightFt")}*`}
                value={dispFt ? String(dispFt) : ""}
                onChangeText={handleHeightFtChange}
                maxDecimals={0}
                allowEmptyOnBlur
                keyboardType="number-pad"
                onBlur={() => handleBlur("height")}
                error={errors.height}
                rightLabel="ft"
                accessibilityLabel={t("heightFt")}
                style={styles.flex1}
              />
              <NumberInput
                label={`${t("heightIn")}*`}
                value={String(dispIn ?? 0)}
                onChangeText={handleHeightInChange}
                maxDecimals={0}
                allowEmptyOnBlur
                keyboardType="number-pad"
                onBlur={() => handleBlur("heightInch")}
                error={errors.heightInch}
                rightLabel="in"
                accessibilityLabel={t("heightIn")}
                style={styles.flex1}
              />
            </View>
          )}

          <NumberInput
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
                      weight: val,
                    }));
                    setErrors((e) => ({ ...e, weight: undefined }));
                  }
                : handleWeightLbsChange
            }
            maxDecimals={0}
            allowEmptyOnBlur
            keyboardType="number-pad"
            onBlur={() => handleBlur("weight")}
            error={errors.weight}
            rightLabel={weightLabel}
            accessibilityLabel={t("weight")}
          />
        </View>
      </ScrollView>
      <View style={styles.actionsWrap}>
        <GlobalActionButtons
          label={editMode ? t("summary.confirm", "Confirm") : t("next")}
          onPress={editMode ? onConfirmEdit : onNext}
          primaryDisabled={!canNext()}
          secondaryLabel={t("cancel")}
          secondaryOnPress={onCancel}
        />
      </View>
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    formScroll: { flex: 1 },
    formContent: { paddingBottom: theme.spacing.sm },
    column: { flexDirection: "column" },
    row: { flexDirection: "row" },
    rowGap: { gap: theme.spacing.sm },
    flex1: { flex: 1 },
    sectionGap: { gap: theme.spacing.lg },
    actionsWrap: { paddingTop: theme.spacing.sm },
    title: {
      fontSize: theme.typography.size.h1,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.size.bodyL,
      color: theme.textSecondary,
      textAlign: "center",
    },
    buttonText: { fontSize: theme.typography.size.bodyS },
    errorText: {
      color: theme.error.text,
      fontSize: theme.typography.size.bodyS,
      textAlign: "center",
    },
  });
