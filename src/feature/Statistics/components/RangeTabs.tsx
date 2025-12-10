import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

export type RangeOption = { key: string; label: string };

type RangeTabsProps = {
  options: RangeOption[];
  active: string;
  onChange: (key: string) => void;
};

export const RangeTabs: React.FC<RangeTabsProps> = ({
  options,
  active,
  onChange,
}) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderRadius: theme.rounded.full,
          padding: theme.spacing.xs,
          borderWidth: 1,
          borderColor: theme.border,
        },
      ]}
    >
      {options.map((opt) => {
        const isActive = active === opt.key;

        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              styles.tab,
              {
                backgroundColor: isActive
                  ? theme.accentSecondary
                  : "transparent",
                borderRadius: theme.rounded.full,
              },
              pressed && { opacity: 0.9 },
            ]}
          >
            <Text
              style={{
                color: isActive ? theme.onAccent : theme.textSecondary,
                fontSize: theme.typography.size.base,
                fontFamily: theme.typography.fontFamily.medium,
                textAlign: "center",
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
