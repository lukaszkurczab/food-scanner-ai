import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type StatCardProps = {
  label: string;
  value: string | number;
  subLabel?: string;
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subLabel,
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          borderRadius: theme.rounded.md,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: theme.textSecondary, fontSize: theme.typography.size.sm },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.value,
          { color: theme.text, fontSize: theme.typography.size.lg },
        ]}
      >
        {value}
      </Text>
      {subLabel && (
        <Text
          style={[
            styles.subLabel,
            { color: theme.textSecondary, fontSize: theme.typography.size.sm },
          ]}
        >
          {subLabel}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    flex: 1,
    minWidth: 80,
  },
  label: {
    fontWeight: "500",
    marginBottom: 4,
  },
  value: {
    fontWeight: "bold",
  },
  subLabel: {
    marginTop: 4,
  },
});
