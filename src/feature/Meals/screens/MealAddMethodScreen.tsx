import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/theme/useTheme";
import type { RootStackParamList } from "@/navigation/navigate";
import AppIcon from "@/components/AppIcon";
import { Modal } from "@/components/Modal";
import { useTranslation } from "react-i18next";
import { useMealAddMethodState } from "@/feature/Meals/hooks/useMealAddMethodState";
import { trackMealAddMethodSelected } from "@/services/telemetry/telemetryInstrumentation";

type MealAddMethodNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MealAddMethod"
>;
type MealAddMethodRouteProp = RouteProp<RootStackParamList, "MealAddMethod">;

const MealAddMethodScreen = () => {
  const navigation = useNavigation<MealAddMethodNavigationProp>();
  const route = useRoute<MealAddMethodRouteProp>();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["meals"]);
  const persistSelection = route.params?.selectionMode === "persistDefault";

  const state = useMealAddMethodState({
    navigation,
    replaceOnStart: true,
    persistSelection,
  });

  return (
    <View style={styles.overlay}>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.goBack()}
        style={styles.dismissArea}
      />

      <View
        style={[
          styles.sheet,
          { paddingBottom: Math.max(insets.bottom, theme.spacing.lg) },
        ]}
      >
        <View style={styles.handle} />
        <Text style={styles.title}>{t("title", "Add meal")}</Text>

        <View style={styles.optionsWrap}>
          {state.options.map((option) => (
            <Pressable
              key={option.key}
              accessibilityRole="button"
              onPress={() => {
                void trackMealAddMethodSelected(option.key);
                void state.handleOptionPress(option);
              }}
              style={({ pressed }) => [
                styles.optionRow,
                pressed ? styles.optionRowPressed : null,
              ]}
              testID={`meal-add-option-${option.key}`}
            >
              <View style={styles.optionIconBox}>
                <AppIcon
                  name={option.icon}
                  size={19}
                  color={theme.primary}
                />
              </View>

              <View style={styles.optionContent}>
                <Text numberOfLines={1} style={styles.optionTitle}>
                  {t(option.titleKey)}
                </Text>
                <Text numberOfLines={2} style={styles.optionDescription}>
                  {t(option.descKey)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <Modal
        visible={state.showResumeModal}
        title={t("resume_draft_title", "Continue your draft?")}
        message={t(
          "resume_draft_message",
          "You already have an unfinished meal draft. Continue it or discard it before starting something new.",
        )}
        primaryAction={{
          label: t("resume_draft_continue", "Continue draft"),
          onPress: () => {
            void state.handleContinueDraft();
          },
        }}
        secondaryAction={{
          label: t("resume_draft_discard", "Start fresh"),
          onPress: () => {
            void state.handleDiscardDraft();
          },
          tone: "destructive",
        }}
        onClose={state.closeResumeModal}
        stackActions
      />
    </View>
  );
};

export default MealAddMethodScreen;

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.overlay,
      justifyContent: "flex-end",
    },
    dismissArea: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: theme.rounded.xl,
      borderTopRightRadius: theme.rounded.xl,
      paddingTop: theme.spacing.sm,
      paddingHorizontal: theme.spacing.screenPadding,
      gap: theme.spacing.sm,
      shadowColor: theme.shadow,
      shadowOpacity: theme.isDark ? 0.4 : 0.18,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -6 },
      elevation: 12,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.border,
      alignSelf: "center",
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.semiBold,
      textAlign: "center",
    },
    optionsWrap: {
      gap: theme.spacing.xs,
      paddingBottom: theme.spacing.sm,
    },
    optionRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
      borderRadius: theme.rounded.md,
    },
    optionRowPressed: {
      backgroundColor: theme.surfaceAlt,
    },
    optionIconBox: {
      width: 38,
      height: 38,
      borderRadius: theme.rounded.sm,
      backgroundColor: theme.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    optionContent: {
      flex: 1,
      gap: 2,
      paddingTop: 1,
    },
    optionTitle: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.medium,
    },
    optionDescription: {
      color: theme.textTertiary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });
