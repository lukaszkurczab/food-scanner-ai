import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

interface ListItemProps {
  label: string;
  onPress?: () => void;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const ListItem: React.FC<ListItemProps> = ({
  label,
  onPress,
  icon,
  style,
  testID,
  accessibilityLabel,
  disabled = false,
  loading = false,
}) => {
  const theme = useTheme();
  const isInactive = disabled || loading;

  return (
    <Pressable
      onPress={isInactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: "transparent",
          borderBottomColor: theme.border,
          opacity: isInactive ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      testID={testID}
      disabled={isInactive}
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
      {loading ? (
        <ActivityIndicator
          size="small"
          color={theme.textSecondary}
          style={styles.chevron}
        />
      ) : (
        <MaterialIcons
          name="chevron-right"
          size={28}
          color={theme.textSecondary}
          style={styles.chevron}
        />
      )}
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
