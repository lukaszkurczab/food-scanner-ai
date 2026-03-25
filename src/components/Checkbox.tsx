import React, { useMemo } from "react";
import {
  TouchableOpacity,
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

  return (
    <TouchableOpacity
      onPress={() => !disabled && onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.box,
        checked ? styles.boxChecked : styles.boxUnchecked,
        disabled && styles.boxDisabled,
        style,
      ]}
      activeOpacity={0.75}
      disabled={disabled}
    >
      {checked ? (
        <AppIcon name="check" size={16} color={theme.cta.primaryText} />
      ) : null}
    </TouchableOpacity>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    box: {
      width: 22,
      height: 22,
      borderRadius: theme.rounded.xs,
      borderWidth: 1.5,
      marginRight: 10,
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
    boxDisabled: {
      opacity: 0.5,
    },
  });
