import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

export const LoadingSkeleton: React.FC<{ height?: number }> = ({
  height = 80,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const dynamicStyle = useMemo(() => ({ height }), [height]);

  return <View style={[styles.skeleton, dynamicStyle]} />;
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    skeleton: {
      borderRadius: theme.rounded.sm + theme.spacing.xs,
      backgroundColor: theme.disabled.background,
      marginBottom: theme.spacing.md - theme.spacing.xs,
    },
  });
