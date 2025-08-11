import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Feather } from "@expo/vector-icons";

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  style?: any;
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
          borderColor: checked ? theme.accentSecondary : theme.border,
          backgroundColor: checked ? theme.accentSecondary : "transparent",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {checked && <Feather name="check" size={16} color={theme.onAccent} />}
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
