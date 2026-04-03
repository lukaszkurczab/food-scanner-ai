import { useMemo, useState } from "react";
import {
  Modal as RNModal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { SettingsRow, SettingsSection } from "@/components";
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";
import type { MealKind } from "@/types/notification";

type MealKindPickerSheetProps = {
  visible: boolean;
  currentValue: MealKind;
  onClose: () => void;
  onSelect: (value: MealKind) => void;
};

const OPTIONS: MealKind[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
];

export function MealKindPickerSheet({
  visible,
  currentValue,
  onClose,
  onSelect,
}: MealKindPickerSheetProps) {
  const { t } = useTranslation("notifications");
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [pendingValue, setPendingValue] = useState<MealKind | null>(null);

  const handleSelect = async (value: MealKind) => {
    if (pendingValue) return;
    if (value === currentValue) {
      onClose();
      return;
    }

    setPendingValue(value);

    try {
      onSelect(value);
      onClose();
    } finally {
      setPendingValue(null);
    }
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, theme.spacing.lg),
            },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>
            {t("form.mealFocusTitle", {
              defaultValue: "Applies to",
            })}
          </Text>
          <Text style={styles.intro}>
            {t("form.mealFocusIntro", {
              defaultValue:
                "Choose which meal this reminder should refer to.",
            })}
          </Text>

          <SettingsSection>
            {OPTIONS.map((value) => {
              const selected = currentValue === value;
              const loading = pendingValue === value;

              return (
                <SettingsRow
                  key={value}
                  title={t(`meals.${value}`, {
                    defaultValue: value,
                  })}
                  onPress={() => {
                    void handleSelect(value);
                  }}
                  loading={loading}
                  testID={`meal-kind-option-${value}`}
                  trailing={
                    selected && !loading ? (
                      <AppIcon
                        name="check"
                        size={18}
                        color={theme.primary}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </SettingsSection>
        </View>
      </View>
    </RNModal>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "flex-end",
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.isDark
        ? "rgba(0, 0, 0, 0.48)"
        : "rgba(47, 49, 43, 0.34)",
    },
    sheet: {
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.md,
      backgroundColor: theme.background,
      borderTopLeftRadius: theme.rounded.xl,
      borderTopRightRadius: theme.rounded.xl,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: theme.borderSoft,
    },
    handle: {
      alignSelf: "center",
      width: 44,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.border,
      marginBottom: theme.spacing.xs,
    },
    title: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.h2,
      lineHeight: theme.typography.lineHeight.h2,
    },
    intro: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
    },
  });

export default MealKindPickerSheet;
