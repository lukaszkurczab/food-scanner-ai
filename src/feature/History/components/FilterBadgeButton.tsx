import React from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type Props = { onPress: () => void; activeCount?: number };

export const FilterBadgeButton: React.FC<Props> = ({
  onPress,
  activeCount = 0,
}) => {
  const theme = useTheme();
  const hasActive = activeCount > 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <Text style={{ color: theme.text }}>Filters</Text>
      {hasActive && (
        <View style={[styles.badge, { backgroundColor: theme.accent }]}>
          <Text
            style={{ color: theme.onAccent, fontSize: 12, fontWeight: "700" }}
          >
            {activeCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  badge: {
    marginLeft: 8,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
});
