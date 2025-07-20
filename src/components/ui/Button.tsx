import { useTheme } from "@/src/theme/index";
import {
  StyleProp,
  TouchableOpacity,
  ViewStyle,
  Text,
  StyleSheet,
  TextStyle,
} from "react-native";

type Variant = "primary" | "secondary";

export const Button = ({
  text,
  onPress,
  style,
  textStyle = {},
  disabled = false,
  variant = "primary",
}: {
  text: string;
  onPress: () => void;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  variant?: Variant;
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const buttonStyle =
    variant === "primary" ? styles.buttonPrimary : styles.buttonSecondary;

  const textColorStyle =
    variant === "primary" ? styles.textPrimary : styles.textSecondary;

  return (
    <TouchableOpacity
      style={[
        styles.buttonBase,
        buttonStyle,
        disabled && styles.buttonDisabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text
        style={[
          styles.buttonTextBase,
          textColorStyle,
          disabled && styles.textDisabled,
          textStyle,
        ]}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    buttonBase: {
      alignItems: "center",
      borderRadius: 32,
      padding: 12,
    },
    buttonPrimary: {
      backgroundColor: theme.accent,
    },
    buttonSecondary: {
      backgroundColor: theme.background,
      borderWidth: 1,
      borderColor: theme.accent,
    },
    buttonDisabled: {
      backgroundColor: theme.border,
      opacity: 0.6,
    },
    buttonTextBase: {
      fontSize: 18,
      fontWeight: "500",
    },
    textPrimary: {
      color: "#fff",
    },
    textSecondary: {
      color: theme.text,
    },
    textDisabled: {
      color: theme.textSecondary,
    },
  });
