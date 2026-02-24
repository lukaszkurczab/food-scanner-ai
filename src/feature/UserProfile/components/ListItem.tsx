import React, { useMemo } from "react";
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
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const isInactive = disabled || loading;
  const labelStyle = useMemo(
    () => ({ color: theme.text }),
    [theme.text]
  );

  return (
    <Pressable
      onPress={isInactive ? undefined : onPress}
      style={({ pressed }) => [
        styles.container,
        styles.containerColors,
        isInactive ? styles.inactive : null,
        pressed && !isInactive ? styles.pressed : null,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      testID={testID}
      disabled={isInactive}
    >
      {icon && <View style={styles.leftIcon}>{icon}</View>}
      <Text style={[styles.label, labelStyle]} numberOfLines={1}>
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

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: 0,
      borderBottomWidth: StyleSheet.hairlineWidth,
      width: "100%",
    },
    containerColors: {
      backgroundColor: "transparent",
      borderBottomColor: theme.border,
    },
    inactive: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.7,
    },
    leftIcon: {
      marginRight: theme.spacing.sm + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
    },
    label: {
      flex: 1,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.md,
    },
    chevron: {
      marginLeft: theme.spacing.sm + theme.spacing.xs,
    },
  });

export default ListItem;
