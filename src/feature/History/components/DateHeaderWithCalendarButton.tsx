import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type Props = { dateLabel: string; onOpenCalendar: () => void };

export const DateHeaderWithCalendarButton: React.FC<Props> = ({
  dateLabel,
  onOpenCalendar,
}) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 8,
      }}
    >
      <Text style={{ color: theme.text, fontWeight: "700" }}>{dateLabel}</Text>
      <Pressable
        onPress={onOpenCalendar}
        style={{
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text style={{ color: theme.text }}>Change date</Text>
      </Pressable>
    </View>
  );
};
