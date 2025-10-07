import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { useTranslation } from "react-i18next";

type Props = {
  isToday: boolean;
  onAddMeal?: () => void;
  onOpenHistory?: () => void;
};

export default function EmptyDayView({
  isToday,
  onAddMeal,
  onOpenHistory,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation("home");
  return (
    <View
      style={{
        backgroundColor: theme.card,
        padding: theme.spacing.lg,
        borderRadius: theme.rounded.md,
        alignItems: "center",
        gap: theme.spacing.md,
        shadowColor: theme.shadow,
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 2,
      }}
    >
      <Text
        style={{
          color: theme.text,
          fontSize: theme.typography.size.lg,
          fontFamily: theme.typography.fontFamily.bold,
        }}
      >
        {t("emptyDay.title")}
      </Text>

      {isToday ? (
        <>
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: theme.typography.size.md,
              textAlign: "center",
            }}
          >
            {t("emptyDay.subtitle_today")}
          </Text>
          {onAddMeal ? (
            <PrimaryButton
              label={t("emptyDay.addMeal")}
              onPress={onAddMeal}
            />
          ) : null}
        </>
      ) : (
        <>
          {onOpenHistory ? (
            <SecondaryButton
              label={t("emptyDay.openHistory")}
              onPress={onOpenHistory}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
