import React, { useEffect, useMemo } from "react";
import { View, Text } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import {
  PrimaryButton,
  SecondaryButton,
  Dropdown,
  Slider,
  CheckboxDropdown,
} from "@/src/components";
import {
  ActivityLevel,
  FormData,
  Preference,
} from "@/src/feature/Onboarding/types";

const PREFERENCE_OPTIONS: { label: string; value: Preference }[] = [
  { label: "preferences.lowCarb", value: "lowCarb" },
  { label: "preferences.keto", value: "keto" },
  { label: "preferences.highProtein", value: "highProtein" },
  { label: "preferences.highCarb", value: "highCarb" },
  { label: "preferences.lowFat", value: "lowFat" },
  { label: "preferences.balanced", value: "balanced" },
  { label: "preferences.vegetarian", value: "vegetarian" },
  { label: "preferences.vegan", value: "vegan" },
  { label: "preferences.pescatarian", value: "pescatarian" },
  { label: "preferences.mediterranean", value: "mediterranean" },
  { label: "preferences.glutenFree", value: "glutenFree" },
  { label: "preferences.dairyFree", value: "dairyFree" },
  { label: "preferences.paleo", value: "paleo" },
];

const PREFERENCE_CONFLICTS: Record<Preference, Preference[]> = {
  lowCarb: ["highCarb", "balanced", "keto"],
  keto: ["highCarb", "balanced", "lowFat", "lowCarb"],
  highProtein: [],
  highCarb: ["keto", "lowCarb"],
  lowFat: ["keto"],
  balanced: ["keto", "lowCarb"],
  vegetarian: ["vegan", "pescatarian"],
  vegan: ["vegetarian", "pescatarian"],
  pescatarian: ["vegan", "vegetarian"],
  mediterranean: [],
  glutenFree: [],
  dairyFree: [],
  paleo: [],
};

type Props = {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  errors: Partial<Record<keyof FormData, string>>;
  setErrors: React.Dispatch<
    React.SetStateAction<Partial<Record<keyof FormData, string>>>
  >;
  onNext: () => void;
  onBack: () => void;
};

export default function Step2Preferences({
  form,
  setForm,
  errors,
  setErrors,
  onNext,
  onBack,
}: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();

  const MIN_DEFICIT = 0.1,
    MAX_DEFICIT = 0.5;
  const MIN_SURPLUS = 0.1,
    MAX_SURPLUS = 0.5;

  const disabledPreferences = useMemo(() => {
    const set = new Set<Preference>();
    for (const v of form.preferences ?? []) {
      (PREFERENCE_CONFLICTS[v] ?? []).forEach((b) => set.add(b));
    }
    return Array.from(set);
  }, [form.preferences]);

  function validate(): boolean {
    let valid = true;
    let newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!form.activityLevel) {
      newErrors.activityLevel = t("validation.selectActivity");
      valid = false;
    }
    if (!form.goal) {
      newErrors.goal = t("validation.selectGoal");
      valid = false;
    }
    if (
      form.goal === "lose" &&
      (form.calorieDeficit === undefined || isNaN(form.calorieDeficit))
    ) {
      newErrors.calorieDeficit = t("validation.selectDeficit");
      valid = false;
    }
    if (
      form.goal === "increase" &&
      (form.calorieSurplus === undefined || isNaN(form.calorieSurplus))
    ) {
      newErrors.calorieSurplus = t("validation.selectSurplus");
      valid = false;
    }
    setErrors(newErrors);
    return valid;
  }

  const canNext = useMemo(() => {
    if (!form.activityLevel) return false;
    if (!form.goal) return false;
    if (
      form.goal === "lose" &&
      (form.calorieDeficit === undefined || isNaN(form.calorieDeficit))
    )
      return false;
    if (
      form.goal === "increase" &&
      (form.calorieSurplus === undefined || isNaN(form.calorieSurplus))
    )
      return false;
    return true;
  }, [form]);

  function handleGoalChange(val: "lose" | "maintain" | "increase") {
    setForm((prev) => ({
      ...prev,
      goal: val,
      calorieDeficit: val === "lose" ? prev.calorieDeficit ?? 0.2 : undefined,
      calorieSurplus:
        val === "increase" ? prev.calorieSurplus ?? 0.2 : undefined,
    }));
  }

  useEffect(() => {
    if (errors.activityLevel && form.activityLevel) {
      setErrors((prev) => ({ ...prev, activityLevel: undefined }));
    }
    if (errors.goal && form.goal) {
      setErrors((prev) => ({ ...prev, goal: undefined }));
    }
    if (
      errors.calorieDeficit &&
      form.goal === "lose" &&
      form.calorieDeficit !== undefined
    ) {
      setErrors((prev) => ({ ...prev, calorieDeficit: undefined }));
    }
    if (
      errors.calorieSurplus &&
      form.goal === "increase" &&
      form.calorieSurplus !== undefined
    ) {
      setErrors((prev) => ({ ...prev, calorieSurplus: undefined }));
    }
  }, [form.activityLevel, form.goal, form.calorieDeficit, form.calorieSurplus]);

  const handleNext = () => {
    if (validate()) onNext();
  };

  return (
    <View
      style={{
        gap: theme.spacing.md,
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
          {t("step2_title")}
        </Text>
        <Text
          style={{
            fontSize: theme.typography.size.base,
            color: theme.textSecondary,
            textAlign: "center",
            marginBottom: theme.spacing.md,
          }}
        >
          {t("step2_description")}
        </Text>
      </View>

      <CheckboxDropdown
        label={t("preferences.label")}
        options={PREFERENCE_OPTIONS.map((o) => ({
          ...o,
          label: t(o.label),
        }))}
        values={form.preferences}
        onChange={(newPrefs) =>
          setForm((prev) => ({ ...prev, preferences: newPrefs }))
        }
        error={undefined}
        disabled={false}
        disabledValues={disabledPreferences}
      />

      <Dropdown
        label={t("activityLevel")}
        value={form.activityLevel}
        options={[
          { label: t("activity.sedentary"), value: "sedentary" },
          { label: t("activity.light"), value: "light" },
          { label: t("activity.moderate"), value: "moderate" },
          { label: t("activity.active"), value: "active" },
          { label: t("activity.very_active"), value: "very_active" },
        ]}
        onChange={(val) =>
          setForm((prev) => ({ ...prev, activityLevel: val as ActivityLevel }))
        }
        error={errors.activityLevel}
      />

      <Dropdown
        label={t("goalTitle")}
        value={form.goal}
        options={[
          { label: t("goal.lose"), value: "lose" },
          { label: t("goal.maintain"), value: "maintain" },
          { label: t("goal.increase"), value: "increase" },
        ]}
        onChange={(val) =>
          handleGoalChange(val as "lose" | "maintain" | "increase")
        }
        error={errors.goal}
      />

      {form.goal === "lose" && (
        <View>
          <Text
            style={{
              fontFamily: theme.typography.fontFamily.medium,
              color: theme.textSecondary,
              fontSize: theme.typography.size.base,
              marginBottom: theme.spacing.xs,
            }}
          >
            {t("calorieDeficit")}{" "}
            {Math.round((form.calorieDeficit ?? 0.2) * 100)}%
          </Text>
          <Slider
            value={form.calorieDeficit ?? 0.2}
            minimumValue={MIN_DEFICIT}
            maximumValue={MAX_DEFICIT}
            step={0.01}
            onValueChange={(v) =>
              setForm((prev) => ({ ...prev, calorieDeficit: v }))
            }
          />
          {errors.calorieDeficit && (
            <Text
              style={{
                color: theme.error.text,
                fontSize: theme.typography.size.sm,
              }}
            >
              {errors.calorieDeficit}
            </Text>
          )}
        </View>
      )}

      {form.goal === "increase" && (
        <View>
          <Text
            style={{
              fontFamily: theme.typography.fontFamily.medium,
              color: theme.textSecondary,
              fontSize: theme.typography.size.base,
              marginBottom: theme.spacing.xs,
            }}
          >
            {t("calorieSurplus")}{" "}
            {Math.round((form.calorieSurplus ?? 0.2) * 100)}%
          </Text>
          <Slider
            value={form.calorieSurplus ?? 0.2}
            minimumValue={MIN_SURPLUS}
            maximumValue={MAX_SURPLUS}
            step={0.01}
            onValueChange={(v) =>
              setForm((prev) => ({ ...prev, calorieSurplus: v }))
            }
          />
          {errors.calorieSurplus && (
            <Text
              style={{
                color: theme.error.text,
                fontSize: theme.typography.size.sm,
              }}
            >
              {errors.calorieSurplus}
            </Text>
          )}
        </View>
      )}

      <PrimaryButton
        label={t("next")}
        onPress={handleNext}
        disabled={!canNext}
        style={{ marginTop: theme.spacing.xl }}
      />
      <SecondaryButton label={t("back")} onPress={onBack} />
    </View>
  );
}
