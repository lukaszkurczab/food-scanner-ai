import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type Props = { message: string; onRetry?: () => void };

export const ErrorState: React.FC<Props> = ({ message, onRetry }) => {
  const theme = useTheme();
  const { t } = useTranslation("common");
  return (
    <View style={styles.container}>
      <Text
        style={{ color: theme.error.text, fontWeight: "700", marginBottom: 8 }}
      >
        {message}
      </Text>
      {onRetry && (
        <Pressable
          onPress={onRetry}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 12,
            backgroundColor: theme.accent,
          }}
        >
          <Text style={{ color: theme.onAccent }}>{t("retry")}</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: "center" },
});
