import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import {
  GlobalActionButtons,
  LongTextInput,
  SelectableGroup,
} from "@/components";
import { trackOnboardingOptionSelected } from "@/services/telemetry/telemetryInstrumentation";
import { useTheme } from "@/theme/useTheme";
import type { FormData, OnboardingMode } from "@/types";
import {
  AI_FOCUS_OPTIONS,
  AI_STYLE_OPTIONS,
} from "@/feature/Onboarding/constants";

type Props = {
  form: FormData;
  setForm: React.Dispatch<React.SetStateAction<FormData>>;
  onContinue: () => void;
  onBack: () => void;
  mode: OnboardingMode;
  submitting?: boolean;
};

export default function Step4AIAssistantPreferences({
  form,
  setForm,
  onContinue,
  onBack,
  mode,
  submitting = false,
}: Props) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.optionalBadge}>
            <Text style={styles.optionalBadgeText}>{t("optional")}</Text>
          </View>
          <Text style={styles.title}>{t("step4.title")}</Text>
          <Text style={styles.subtitle}>{t("step4.description")}</Text>
        </View>

        <View style={styles.panel}>
          <SelectableGroup
            label={t("step4.toneLabel")}
            options={AI_STYLE_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
              description: t(option.descriptionKey),
            }))}
            value={form.aiStyle ?? "none"}
            onChange={(nextStyle) => {
              setForm((current) => ({
                ...current,
                aiStyle: nextStyle,
              }));
              void trackOnboardingOptionSelected({
                mode,
                step: 4,
                field: "aiStyle",
                value: nextStyle,
              });
            }}
            variant="card"
          />
        </View>

        <View style={styles.panel}>
          <SelectableGroup
            label={t("step4.focusLabel")}
            options={AI_FOCUS_OPTIONS.map((option) => ({
              value: option.value,
              label: t(option.labelKey),
              description: t(option.descriptionKey),
            }))}
            value={form.aiFocus ?? "none"}
            onChange={(nextFocus) => {
              setForm((current) => ({
                ...current,
                aiFocus: nextFocus,
                aiFocusOther: "",
              }));
              void trackOnboardingOptionSelected({
                mode,
                step: 4,
                field: "aiFocus",
                value: nextFocus,
              });
            }}
            variant="card"
          />
        </View>

        <View style={styles.panel}>
          <LongTextInput
            label={t("step4.noteLabel")}
            value={form.aiNote ?? ""}
            onChangeText={(nextValue) => {
              setForm((current) => ({
                ...current,
                aiNote: nextValue,
              }));
            }}
            placeholder={t("step4.notePlaceholder")}
            maxLength={220}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <GlobalActionButtons
          label={t("step4.primaryCta")}
          onPress={onContinue}
          loading={submitting}
          secondaryLabel={t("common:back")}
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
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xl,
    },
    header: {
      gap: theme.spacing.sm,
    },
    optionalBadge: {
      alignSelf: "flex-start",
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.rounded.full,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    optionalBadgeText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.medium,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.displayM,
      lineHeight: theme.typography.lineHeight.displayM,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
    },
    panel: {
      padding: theme.spacing.cardPaddingLarge,
      borderRadius: theme.rounded.xl,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceElevated,
      gap: theme.spacing.md,
      shadowColor: theme.shadow,
      shadowOpacity: theme.isDark ? 0.16 : 0.08,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      elevation: 3,
    },
    disclaimer: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.regular,
    },
    footer: {
      paddingTop: theme.spacing.md,
    },
  });
