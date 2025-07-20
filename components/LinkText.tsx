import React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type LinkTextProps = {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle | TextStyle;
};

export const LinkText: React.FC<LinkTextProps> = ({
  children,
  onPress,
  disabled = false,
  style,
}) => {
  const theme = useTheme();

  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={{}}>
      <Text
        style={[
          styles(theme, theme.typography).link,
          disabled && { opacity: 0.6 },
          style,
        ]}
      >
        {children}
      </Text>
    </TouchableOpacity>
  );
};

const styles = (theme: any, typography: any) => ({
  link: {
    color: theme.link,
    fontFamily: typography.fontFamily.medium,
    fontSize: typography.size.sm,
  },
});
