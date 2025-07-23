import React from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import {
  PrimaryButton,
  SecondaryButton,
  CheckboxDropdown,
  LongTextInput,
  TextInput,
} from "@/src/components";
import {
  FormData,
  ChronicDisease,
  Allergy,
} from "@/src/feature/Onboarding/types";

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
  onNext: () => void;
  onBack: () => void;
};

export default function Step3Health({
  form,
  setForm,
  errors = {},
  setErrors,
  onNext,
  onBack,
}: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();

  const hasChronicOther = (form.chronicDiseases ?? []).includes("other");
  const hasAllergyOther = (form.allergies ?? []).includes("other");

  const validate = () => {
    let valid = true;
    const newErrors: Partial<
      Record<keyof FormData | "chronicDiseasesOther" | "allergiesOther", string>
    > = {};

    if (hasChronicOther && !form.chronicDiseasesOther?.trim()) {
      newErrors.chronicDiseasesOther = t(
        "validation.otherRequired",
        "Please specify your chronic disease"
      );
      valid = false;
    }
    if (hasAllergyOther && !form.allergiesOther?.trim()) {
      newErrors.allergiesOther = t(
        "validation.otherRequired",
        "Please specify your allergy"
      );
      valid = false;
    }
    if (setErrors) setErrors(newErrors);
    return valid;
  };

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <View
      style={{
        gap: theme.spacing.lg,
        flexDirection: "column",
        flex: 1,
        justifyContent: "center",
      }}
    >
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
          {t("healthProfile.title", "Your health profile")}
        </Text>
        <Text
          style={{
            fontSize: theme.typography.size.base,
            color: theme.textSecondary,
            textAlign: "center",
            marginBottom: theme.spacing.md,
          }}
        >
          {t(
            "healthProfile.desc",
            "Knowing about any health conditions or allergies ensures that our recommendations are safe and suitable for you."
          )}
        </Text>
      </View>

      <View>
        <Text
          style={{
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.base,
            color: theme.text,
            marginBottom: theme.spacing.xs,
          }}
        >
          {t("healthProfile.chronicDisease", "Chronic disease")}
        </Text>
        <CheckboxDropdown<ChronicDisease>
          options={CHRONIC_DISEASE_OPTIONS.map((o) => ({
            ...o,
            label: t(`healthProfile.disease.${o.value}`, o.label),
          }))}
          values={form.chronicDiseases ?? []}
          onChange={(val) =>
            setForm((prev) => ({
              ...prev,
              chronicDiseases: val as ChronicDisease[],
              chronicDiseasesOther: val.includes("other")
                ? prev.chronicDiseasesOther ?? ""
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
            placeholder={t(
              "healthProfile.disease.otherPlaceholder",
              "Please specify..."
            )}
            error={errors.chronicDiseasesOther}
            style={{ marginTop: theme.spacing.md }}
          />
        )}
      </View>

      <View>
        <Text
          style={{
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.base,
            color: theme.text,
            marginBottom: theme.spacing.xs,
          }}
        >
          {t("healthProfile.allergies", "Allergies")}
        </Text>
        <CheckboxDropdown<Allergy>
          options={ALLERGIES_OPTIONS.map((o) => ({
            ...o,
            label: t(`healthProfile.allergy.${o.value}`, o.label),
          }))}
          values={form.allergies ?? []}
          onChange={(val) =>
            setForm((prev) => ({
              ...prev,
              allergies: val as Allergy[],
              allergiesOther: val.includes("other")
                ? prev.allergiesOther ?? ""
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
            placeholder={t(
              "healthProfile.allergy.otherPlaceholder",
              "Please specify..."
            )}
            error={errors.allergiesOther}
            style={{ marginTop: theme.spacing.md }}
          />
        )}
      </View>

      <View>
        <Text
          style={{
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.base,
            color: theme.text,
            marginBottom: theme.spacing.xs,
          }}
        >
          {t("healthProfile.lifestyle", "Your lifestyle")}
        </Text>
        <LongTextInput
          value={form.lifestyle ?? ""}
          onChangeText={(val) =>
            setForm((prev) => ({ ...prev, lifestyle: val }))
          }
          placeholder={t(
            "healthProfile.lifestylePlaceholder",
            "Your daily habits"
          )}
          style={{}}
        />
      </View>

      <PrimaryButton
        label={t("next")}
        onPress={handleNext}
        style={{ marginTop: theme.spacing.xl }}
      />
      <SecondaryButton label={t("back")} onPress={onBack} />
    </View>
  );
}
