import React, { useMemo } from "react";
import { View, Text, Pressable, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import type { UserNotification } from "@/types/notification";
import { ButtonToggle } from "@/components/ButtonToggle";
import { useTranslation } from "react-i18next";

type Props = {
  item: UserNotification;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
  onRemove: () => void;
};

export const NotificationCard: React.FC<Props> = ({
  item,
  onPress,
  onToggle,
  onRemove,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("notifications");
  const time = `${String(item.time.hour).padStart(2, "0")}:${String(
    item.time.minute
  ).padStart(2, "0")}`;

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={styles.detailsColumn}>
        <Text style={styles.title}>{item.name}</Text>
        <Text style={styles.secondaryText}>{t(`type.${item.type}`)}</Text>
        <Text style={styles.secondaryText}>{time}</Text>
      </View>
      <View style={styles.actionsColumn}>
        <ButtonToggle
          value={!!item.enabled}
          onToggle={onToggle}
          trackColor={
            item.enabled ? theme.accentSecondary : theme.textSecondary
          }
        />
        <TouchableOpacity onPress={onRemove}>
          <Text style={styles.deleteText}>
            {t("form.delete", "Delete")}
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    card: {
      borderBottomWidth: 1,
      borderColor: theme.border,
      padding: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    detailsColumn: {
      gap: theme.spacing.xs,
    },
    title: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
    secondaryText: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    },
    actionsColumn: {
      gap: theme.spacing.md,
      alignItems: "center",
    },
    deleteText: {
      color: theme.error.text || "#d00",
      fontFamily: theme.typography.fontFamily.regular,
    },
  });
