import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import {
  PrimaryButton,
  SecondaryButton,
  Dropdown,
  TextInput,
  LongTextInput,
} from "@/components";
import { AiStyle, AiFocus, FormData } from "@/types";

const ASSISTANT_STYLE_OPTIONS: { label: string; value: AiStyle }[] = [
  { label: "ai.style.none", value: "none" },
  { label: "ai.style.concise", value: "concise" },
  { label: "ai.style.friendly", value: "friendly" },
  { label: "ai.style.detailed", value: "detailed" },
  { label: "ai.style.strict", value: "strict" },
];

const AREA_OF_FOCUS_OPTIONS: { label: string; value: AiFocus }[] = [
  { label: "ai.focus.none", value: "none" },
  { label: "ai.focus.mealPlanning", value: "mealPlanning" },
  { label: "ai.focus.analyzingMistakes", value: "analyzingMistakes" },
  { label: "ai.focus.quickAnswers", value: "quickAnswers" },
  { label: "ai.focus.motivation", value: "motivation" },
  { label: "ai.focus.other", value: "other" },
];

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
  onBack: () => void;
};

export default function Step4AIAssistantPreferences({
  form,
  setForm,
  errors,
  editMode,
  onConfirmEdit,
  onNext,
  onBack,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation("onboarding");

  const isOtherFocus = form.aiFocus === "other";

  const canNext = useMemo(() => {
    if (form.aiFocus === "other" && !form.aiFocusOther?.trim()) return false;
    return true;
  }, [form.aiFocus, form.aiFocusOther]);

  const assistantStyleValue = form.aiStyle ?? "none";
  const areaOfFocusValue = form.aiFocus ?? "none";

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
            {t("step4_title")}
          </Text>
          <Text
            style={{
              fontSize: theme.typography.size.base,
              color: theme.textSecondary,
              textAlign: "center",
              marginBottom: theme.spacing.md,
            }}
          >
            {t("step4_description")}
          </Text>
        </View>

        <Dropdown
          label={t("ai.assistantStyle")}
          value={assistantStyleValue}
          options={ASSISTANT_STYLE_OPTIONS.map((o) => ({
            label: t(o.label),
            value: o.value,
          }))}
          onChange={(v) =>
            setForm((prev) => ({ ...prev, aiStyle: v ?? "none" }))
          }
          error={undefined}
        />

        <Dropdown
          label={t("ai.areaOfFocus")}
          value={areaOfFocusValue}
          options={AREA_OF_FOCUS_OPTIONS.map((o) => ({
            label: t(o.label),
            value: o.value,
          }))}
          onChange={(v) =>
            setForm((prev) => ({
              ...prev,
              aiFocus: v ?? "none",
              aiFocusOther: v === "other" ? (prev.aiFocusOther ?? "") : "",
            }))
          }
          error={undefined}
        />

        {isOtherFocus && (
          <TextInput
            placeholder={t("ai.focus_placeholder")}
            value={form.aiFocusOther ?? ""}
            onChangeText={(val) =>
              setForm((prev) => ({ ...prev, aiFocusOther: val }))
            }
            error={errors.aiFocusOther}
            maxLength={100}
          />
        )}
      </View>
      <View style={{ gap: theme.spacing.lg }}>
        <PrimaryButton
          label={editMode ? t("summary.confirm", "Confirm") : t("skip")}
          onPress={editMode ? onConfirmEdit : onNext}
          disabled={!canNext}
        />
        <SecondaryButton label={t("back")} onPress={onBack} />
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
});
