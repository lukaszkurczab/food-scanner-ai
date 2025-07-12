import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useTheme } from "@theme/index";

export const Spinner = ({ size = "large" }: { size?: "small" | "large" }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.accentSecondary} />
    </View>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
  });
