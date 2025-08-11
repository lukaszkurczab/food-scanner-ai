import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

interface SectionHeaderProps {
  label: string;
  style?: object;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  label,
  style,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style]}>
      <Text
        style={{
          color: theme.textSecondary,
          fontFamily: theme.typography.fontFamily.medium,
          fontSize: theme.typography.size.base,
          marginBottom: theme.spacing.xs,
          letterSpacing: 0.5,
        }}
        accessibilityRole="header"
      >
        {label}
      </Text>
      <View
        style={{
          height: 1,
          backgroundColor: theme.border,
          marginTop: theme.spacing.xs,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
    marginBottom: 8,
  },
});

export default SectionHeader;
