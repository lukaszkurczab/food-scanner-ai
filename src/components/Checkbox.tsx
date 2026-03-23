import React from "react";
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from "react-native";
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

  return (
    <TouchableOpacity
      onPress={() => !disabled && onChange(!checked)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.box,
        {
          borderColor: checked ? theme.accentSecondary : theme.textSecondary,
          backgroundColor: checked ? theme.accentSecondary : "transparent",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {checked && <AppIcon name="check" size={16} color={theme.onAccent} />}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    marginRight: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
