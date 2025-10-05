import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { LineGraph } from "@/components";
import { useTranslation } from "react-i18next";

type WeeklyProgressGraphProps = {
  data: number[];
  labels: string[];
};

export const WeeklyProgressGraph = ({
  data,
  labels,
}: WeeklyProgressGraphProps) => {
  const theme = useTheme();
  const { t } = useTranslation("home");

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          paddingTop: theme.spacing.md,
          paddingRight: theme.spacing.md,
          borderRadius: theme.rounded.md,
          shadowColor: theme.shadow,
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 2,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.text,
            fontSize: theme.typography.size.lg,
            marginBottom: theme.spacing.md,
            paddingLeft: theme.spacing.md,
          },
        ]}
      >
        {t("weeklyProgress")}
      </Text>
      <LineGraph data={data} labels={labels} stepX={1} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  title: { fontWeight: "700" },
});
