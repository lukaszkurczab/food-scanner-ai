import React, { useMemo } from "react";
import { View, ViewStyle, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  step: number;
  total: number;
  style?: ViewStyle;
};

const DOT_SIZE = 12;
const DOT_SPACING = 12;

const ProgressDots: React.FC<Props> = ({ step, total, style }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const rowStyle = useMemo(
    () => ({ marginBottom: theme.spacing.lg }),
    [theme.spacing.lg]
  );
  const getDotStyle = (index: number) => ({
    backgroundColor:
      index + 1 <= step ? theme.accentSecondary : theme.textSecondary,
    opacity: index + 1 === step ? 1 : 0.6,
  });

  return (
    <View style={[styles.row, rowStyle, style]}>
      {Array.from({ length: total }).map((_, i) => (
        <View key={i} style={[styles.dot, getDotStyle(i)]} />
      ))}
    </View>
  );
};

export default ProgressDots;

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      paddingRight: theme.spacing.xl - theme.spacing.xs,
      gap: DOT_SPACING,
    },
    dot: {
      flexGrow: 1,
      height: DOT_SIZE,
      borderRadius: theme.rounded.full,
    },
  });
