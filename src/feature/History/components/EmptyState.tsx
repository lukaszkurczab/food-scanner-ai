import React from "react";
import { View, Text, Pressable } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type Props = { title: string; description?: string };

export const EmptyState: React.FC<Props> = ({ title, description }) => {
  const theme = useTheme();
  return (
    <View style={{ alignItems: "center", padding: 24 }}>
      <View
        style={{
          width: 140,
          height: 140,
          borderRadius: 20,
          backgroundColor: theme.card,
          marginBottom: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialIcons name="no-meals" size={76} color={theme.textSecondary} />
      </View>
      <Text
        style={{
          color: theme.text,
          fontSize: 22,
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
            fontSize: 18,
          }}
        >
          {description}
        </Text>
      )}
    </View>
  );
};
