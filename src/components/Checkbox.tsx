import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import AppIcon from "@/components/AppIcon";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  accessibilityLabel?: string;
};

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  style,
  disabled = false,
  accessibilityLabel = "Checkbox",
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const iconColor = disabled ? theme.disabled.text : theme.surfaceElevated;

  return (
    <Pressable
      onPress={() => !disabled && onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.box,
        checked ? styles.boxChecked : styles.boxUnchecked,
        disabled
          ? checked
            ? styles.boxCheckedDisabled
            : styles.boxUncheckedDisabled
          : null,
        pressed && !disabled ? styles.boxPressed : null,
        style,
      ]}
      disabled={disabled}
    >
      {checked ? (
        <AppIcon name="check" size={14} color={iconColor} />
      ) : null}
    </Pressable>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    box: {
      width: 24,
      height: 24,
      borderRadius: theme.rounded.xs,
      borderWidth: 2,
      justifyContent: "center",
      alignItems: "center",
    },
    boxChecked: {
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    boxUnchecked: {
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    boxCheckedDisabled: {
      borderColor: theme.disabled.border,
      backgroundColor: theme.disabled.background,
    },
    boxUncheckedDisabled: {
      borderColor: theme.input.borderDisabled,
      backgroundColor: theme.input.backgroundDisabled,
    },
    boxPressed: {
      opacity: 0.82,
    },
  });
