import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  label?: string;
  testID?: string;
};

export function FullScreenLoader({ label, testID }: Props) {
  const theme = useTheme();
  const indicatorColor = theme.accent ?? theme.accentSecondary ?? theme.text;
  const captionColor = theme.textSecondary ?? theme.text;
  const fontSize = theme.typography?.size?.md ?? 16;

  return (
    <View
      testID={testID}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ActivityIndicator size="large" color={indicatorColor} />
      {label ? (
        <Text
          style={{
            marginTop: 12,
            color: captionColor,
            fontSize,
            textAlign: "center",
          }}
        >
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
});
