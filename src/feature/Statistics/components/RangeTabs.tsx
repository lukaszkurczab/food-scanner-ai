import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

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
    <View style={styles.container}>
      {options.map((opt) => {
        const isActive = active === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.tab,
              {
                backgroundColor: isActive ? theme.accent : "transparent",
                borderColor: theme.border,
                borderRadius: theme.rounded.sm,
                width: "37%",
                flexShrink: 1,
              },
            ]}
          >
            <Text
              style={{
                color: isActive ? theme.onAccent : theme.text,
                fontWeight: "500",
                fontSize: theme.typography.size.base,
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
    gap: 8,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
});
