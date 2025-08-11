import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { LineGraph } from "@/components";

type WeeklyProgressGraphProps = {
  data: number[];
  labels: string[];
};

export const WeeklyProgressGraph = ({
  data,
  labels,
}: WeeklyProgressGraphProps) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          borderColor: theme.border,
          paddingTop: theme.spacing.md,
          paddingRight: theme.spacing.md,
          borderRadius: theme.rounded.md,
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
        Weekly Progress
      </Text>
      <LineGraph data={data} labels={labels} stepX={1} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { borderWidth: 1 },
  title: { fontWeight: "bold" },
});
