import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";

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
        Brak posiłków tego dnia
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
            Dodaj pierwszy posiłek, aby rozpocząć zapis dnia.
          </Text>
          {onAddMeal ? (
            <PrimaryButton label="Dodaj posiłek" onPress={onAddMeal} />
          ) : null}
        </>
      ) : (
        <>
          {onOpenHistory ? (
            <SecondaryButton
              label="Przejdź do historii"
              onPress={onOpenHistory}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
