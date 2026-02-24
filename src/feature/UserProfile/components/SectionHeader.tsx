import React, { useMemo } from "react";
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
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.label} accessibilityRole="header">
        {label}
      </Text>
      <View style={styles.divider} />
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      width: "100%",
      marginBottom: theme.spacing.sm,
    },
    label: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.base,
      marginBottom: theme.spacing.xs,
      letterSpacing: 0.5,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
      marginTop: theme.spacing.xs,
    },
  });

export default SectionHeader;
