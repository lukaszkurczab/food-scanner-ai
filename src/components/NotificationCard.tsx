import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import type { UserNotification } from "@/types/notification";
import { ButtonToggle } from "@/components/ButtonToggle";

type Props = {
  item: UserNotification;
  onPress: () => void;
  onToggle: (enabled: boolean) => void;
};

export const NotificationCard: React.FC<Props> = ({
  item,
  onPress,
  onToggle,
}) => {
  const theme = useTheme();
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
          {item.type}
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
      <ButtonToggle
        value={!!item.enabled}
        onToggle={onToggle}
        trackColor={item.enabled ? theme.accentSecondary : theme.textSecondary}
      />
    </Pressable>
  );
};
