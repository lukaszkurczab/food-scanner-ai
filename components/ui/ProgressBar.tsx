import { useTheme } from "@theme/index";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";

type ProgressBarProps = {
  progress: number;
  style?: StyleProp<ViewStyle>;
};

export const ProgressBar = ({ progress, style }: ProgressBarProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const clampedProgress = Math.max(0, Math.min(progress, 1));

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.progress, { width: `${clampedProgress * 100}%` }]} />
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      height: 12,
      width: "100%",
      backgroundColor: theme.accent,
      borderRadius: 6,
      overflow: "hidden",
    },
    progress: {
      height: "100%",
      backgroundColor: theme.accent,
      borderRadius: 6,
    },
  });
