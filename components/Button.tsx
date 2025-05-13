import { useTheme } from "@/theme/useTheme";
import {
  StyleProp,
  TouchableOpacity,
  ViewStyle,
  Text,
  StyleSheet,
} from "react-native";

export const Button = ({
  text,
  onPress,
  style,
}: {
  text: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  return (
    <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.buttonText}>{text}</Text>
    </TouchableOpacity>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    button: {
      backgroundColor: theme.secondary,
      alignItems: "center",
      borderRadius: 32,
      marginTop: 32,
      padding: 12,
    },
    buttonText: {
      fontSize: 18,
      fontWeight: "500",
    },
  });
