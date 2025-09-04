import React from "react";
import { View, Text, Pressable, TouchableOpacity } from "react-native";
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
  const { t } = useTranslation("notifications");
  const time = `${String(item.time.hour).padStart(2, "0")}:${String(
    item.time.minute
  ).padStart(2, "0")}`;

  return (
    <Pressable
      onPress={onPress}
      style={{
        borderBottomWidth: 1,
        borderColor: theme.border,
        padding: theme.spacing.sm,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <View style={{ gap: 4 }}>
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.typography.fontFamily.bold,
          }}
        >
          {item.name}
        </Text>
        <Text
          style={{
            color: theme.textSecondary,
            fontFamily: theme.typography.fontFamily.regular,
          }}
        >
          {t(`type.${item.type}`)}
        </Text>
        <Text
          style={{
            color: theme.textSecondary,
            fontFamily: theme.typography.fontFamily.regular,
          }}
        >
          {time}
        </Text>
      </View>
      <View style={{ gap: 16, alignItems: "center" }}>
        <ButtonToggle
          value={!!item.enabled}
          onToggle={onToggle}
          trackColor={
            item.enabled ? theme.accentSecondary : theme.textSecondary
          }
        />
        <TouchableOpacity onPress={onRemove}>
          <Text style={{ color: theme.error.text || "#d00" }}>
            {t("form.delete", "Delete")}
          </Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
};
