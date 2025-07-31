import React from "react";
import { View, Text, StyleSheet, Pressable, ViewStyle } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

interface ListItemProps {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
}

export const ListItem: React.FC<ListItemProps> = ({
  label,
  onPress,
  icon,
  style,
  testID,
  accessibilityLabel,
}) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: "transparent",
          borderBottomColor: theme.border,
        },
        pressed && { opacity: 0.7 },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      testID={testID}
    >
      {icon && <View style={styles.leftIcon}>{icon}</View>}
      <Text
        style={{
          flex: 1,
          color: theme.text,
          fontFamily: theme.typography.fontFamily.bold,
          fontSize: theme.typography.size.md,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <MaterialIcons
        name="chevron-right"
        size={28}
        color={theme.textSecondary}
        style={styles.chevron}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    width: "100%",
  },
  leftIcon: {
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    marginLeft: 12,
  },
});

export default ListItem;
