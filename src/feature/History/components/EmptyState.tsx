import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type Props = { title: string; description?: string };

export const EmptyState: React.FC<Props> = ({ title, description }) => {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconBox,
          { backgroundColor: theme.card },
        ]}
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

const styles = StyleSheet.create({
  container: { alignItems: "center", padding: 24 },
  iconBox: {
    width: 140,
    height: 140,
    borderRadius: 20,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
