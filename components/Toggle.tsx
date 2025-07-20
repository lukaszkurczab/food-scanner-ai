import React from "react";
import {
  Text,
  Switch as RNSwitch,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type ToggleProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  label?: string;
  style?: StyleProp<ViewStyle>;
};

export const Toggle: React.FC<ToggleProps> = ({
  value,
  onValueChange,
  disabled = false,
  label,
  style,
}) => {
  const theme = useTheme();

  const trackOn = theme.accent;
  const trackOff = theme.border;
  const thumbOn = theme.onAccent;
  const thumbOff = theme.background;
  const trackDisabled = theme.disabled.background;
  const thumbDisabled = theme.disabled.text;

  const handleToggle = () => {
    if (!disabled) {
      onValueChange(!value);
    }
  };

  return (
    <Pressable
      onPress={handleToggle}
      disabled={disabled}
      style={[styles.row, style, { opacity: disabled ? 0.5 : 1 }]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={label}
    >
      {label && (
        <Text
          style={{
            color: disabled ? theme.disabled.text : theme.text,
            fontSize: theme.typography.size.base,
            fontFamily: theme.typography.fontFamily.regular,
            marginRight: theme.spacing.md,
            flex: 1,
          }}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
      <RNSwitch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: disabled ? trackDisabled : trackOff,
          true: disabled ? trackDisabled : trackOn,
        }}
        thumbColor={disabled ? thumbDisabled : value ? thumbOn : thumbOff}
        ios_backgroundColor={disabled ? trackDisabled : trackOff}
        style={styles.switch}
      />
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 40,
    paddingVertical: 2,
    paddingHorizontal: 4,
    width: "100%",
  },
  switch: {
    marginLeft: 8,
  },
});
