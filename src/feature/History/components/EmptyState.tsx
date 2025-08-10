import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type Action = { label: string; onPress: () => void };

type Props = { title: string; description?: string; actions?: Action[] };

export const EmptyState: React.FC<Props> = ({
  title,
  description,
  actions = [],
}) => {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", padding: 24 }}>
      <View
        style={{
          width: 140,
          height: 140,
          borderRadius: 20,
          backgroundColor: theme.card,
          borderWidth: 1,
          borderColor: theme.border,
          marginBottom: 16,
        }}
      />
      <Text
        style={{
          color: theme.text,
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      {!!description && (
        <Text
          style={{
            color: theme.textSecondary,
            textAlign: "center",
            marginBottom: 16,
          }}
        >
          {description}
        </Text>
      )}
      <View style={{ flexDirection: "row", gap: 12 }}>
        {actions.map((a, i) => (
          <Pressable
            key={i}
            onPress={a.onPress}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
          >
            <Text style={{ color: theme.text }}>{a.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
};
