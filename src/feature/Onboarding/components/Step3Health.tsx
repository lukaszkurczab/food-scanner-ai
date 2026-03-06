import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import {
  CheckboxDropdown,
  LongTextInput,
  TextInput,
} from "@/components";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";
import { FormData, ChronicDisease, Allergy } from "@/types";

const CHRONIC_DISEASE_OPTIONS: { label: string; value: ChronicDisease }[] = [
  { label: "Diabetes", value: "diabetes" },
  { label: "Hypertension", value: "hypertension" },
  { label: "Asthma", value: "asthma" },
  { label: "Other", value: "other" },
];

const ALLERGIES_OPTIONS: { label: string; value: Allergy }[] = [
  { label: "Peanuts", value: "peanuts" },
  { label: "Gluten", value: "gluten" },
  { label: "Lactose", value: "lactose" },
  { label: "Other", value: "other" },
];

type Props = {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors?: Partial<
    Record<keyof FormData | "chronicDiseasesOther" | "allergiesOther", string>
  >;
  setErrors?: React.Dispatch<
    React.SetStateAction<
      Partial<
        Record<
          keyof FormData | "chronicDiseasesOther" | "allergiesOther",
          string
        >
      >
    >
  >;
  editMode: boolean;
  onConfirmEdit: () => void;
  onNext: () => void;
  onBack: () => void;
};

export default function Step3Health({
  form,
  setForm,
  errors = {},
  setErrors,
  editMode,
  onConfirmEdit,
  onNext,
  onBack,
}: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const hasChronicOther = (form.chronicDiseases ?? []).includes("other");
  const hasAllergyOther = (form.allergies ?? []).includes("other");
  const hasAnyHealthDetails = useMemo(() => {
    const hasDiseases = (form.chronicDiseases ?? []).length > 0;
    const hasAllergies = (form.allergies ?? []).length > 0;
    const hasLifestyle = Boolean(form.lifestyle?.trim());
    const hasDiseaseOther = Boolean(form.chronicDiseasesOther?.trim());
    const hasAllergyOther = Boolean(form.allergiesOther?.trim());
    return (
      hasDiseases ||
      hasAllergies ||
      hasLifestyle ||
      hasDiseaseOther ||
      hasAllergyOther
    );
  }, [
    form.allergies,
    form.allergiesOther,
    form.chronicDiseases,
    form.chronicDiseasesOther,
    form.lifestyle,
  ]);

  const validate = () => {
    let valid = true;
    const newErrors: Partial<
      Record<keyof FormData | "chronicDiseasesOther" | "allergiesOther", string>
    > = {};

    if (hasChronicOther && !form.chronicDiseasesOther?.trim()) {
      newErrors.chronicDiseasesOther = t("validation.otherRequired");
      valid = false;
    }
    if (hasAllergyOther && !form.allergiesOther?.trim()) {
      newErrors.allergiesOther = t("validation.otherRequired");
      valid = false;
    }
    if (setErrors) setErrors(newErrors);
    return valid;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

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
            <Text style={styles.title}>
              {t("healthProfile.title")}
            </Text>
            <Text style={styles.subtitle}>
              {t("healthProfile.desc")}
            </Text>
          </View>

          <View>
            <CheckboxDropdown<ChronicDisease>
              label={t("healthProfile.chronicDisease")}
              options={CHRONIC_DISEASE_OPTIONS.map((o) => ({
                ...o,
                label: t(`healthProfile.disease.${o.value}`),
              }))}
              values={form.chronicDiseases ?? []}
              onChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  chronicDiseases: val as ChronicDisease[],
                  chronicDiseasesOther: val.includes("other")
                    ? (prev.chronicDiseasesOther ?? "")
                    : undefined,
                }))
              }
            />
            {hasChronicOther && (
              <TextInput
                value={form.chronicDiseasesOther ?? ""}
                onChangeText={(v) =>
                  setForm((prev) => ({ ...prev, chronicDiseasesOther: v }))
                }
                placeholder={t("healthProfile.disease.otherPlaceholder")}
                error={errors.chronicDiseasesOther}
                style={styles.fieldSpacing}
              />
            )}
          </View>

          <View>
            <CheckboxDropdown<Allergy>
              label={t("healthProfile.allergies")}
              options={ALLERGIES_OPTIONS.map((o) => ({
                ...o,
                label: t(`healthProfile.allergy.${o.value}`),
              }))}
              values={form.allergies ?? []}
              onChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  allergies: val as Allergy[],
                  allergiesOther: val.includes("other")
                    ? (prev.allergiesOther ?? "")
                    : undefined,
                }))
              }
            />
            {hasAllergyOther && (
              <TextInput
                value={form.allergiesOther ?? ""}
                onChangeText={(v) =>
                  setForm((prev) => ({ ...prev, allergiesOther: v }))
                }
                placeholder={t("healthProfile.allergy.otherPlaceholder")}
                error={errors.allergiesOther}
                style={styles.fieldSpacing}
              />
            )}
          </View>

          <LongTextInput
            label={t("healthProfile.lifestyle")}
            value={form.lifestyle ?? ""}
            onChangeText={(val) =>
              setForm((prev) => ({ ...prev, lifestyle: val }))
            }
            placeholder={t("healthProfile.lifestylePlaceholder")}
          />
        </View>
      </ScrollView>
      <View style={styles.actionsWrap}>
        <GlobalActionButtons
          label={
            editMode
              ? t("summary.confirm", "Confirm")
              : hasAnyHealthDetails
                ? t("next")
                : t("skip")
          }
          onPress={editMode ? onConfirmEdit : handleNext}
          secondaryLabel={t("back")}
          secondaryOnPress={onBack}
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
    sectionGap: { gap: theme.spacing.lg },
    actionsWrap: { paddingTop: theme.spacing.sm },
    title: {
      fontSize: theme.typography.size.xl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      textAlign: "center",
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.size.base,
      color: theme.textSecondary,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    fieldSpacing: { marginTop: theme.spacing.md },
  });
