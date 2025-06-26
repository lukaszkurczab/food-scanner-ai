import { useTheme } from "../theme/useTheme";
import {
  StyleProp,
  TouchableOpacity,
  ViewStyle,
  Text,
  StyleSheet,
  TextStyle,
} from "react-native";

export const Button = ({
  text,
  onPress,
  style,
  textStyle = {},
  disabled = false,
}: {
  text: string;
  onPress: () => void;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.buttonDisabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[styles.buttonText, disabled && styles.textDisabled, textStyle]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    button: {
      backgroundColor: theme.secondary,
      alignItems: "center",
      borderRadius: 32,
      padding: 12,
    },
    buttonDisabled: {
      backgroundColor: theme.disabled,
      opacity: 0.6,
    },
    buttonText: {
      fontSize: 18,
      fontWeight: "500",
      color: theme.text,
    },
    textDisabled: {
      color: theme.textSecondary,
    },
  });
