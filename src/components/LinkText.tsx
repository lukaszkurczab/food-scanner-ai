import React from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  GestureResponderEvent,
  TouchableOpacityProps,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type LinkTextProps = {
  children?: React.ReactNode;
  text?: string;
  style?: ViewStyle | TextStyle;
  disabled?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
} & TouchableOpacityProps;

export const LinkText: React.FC<LinkTextProps> = ({
  children,
  text,
  style,
  disabled,
  onPress,
  ...rest
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} {...rest}>
      <Text style={[styles(theme).link, disabled && { opacity: 0.6 }, style]}>
        {children || text}
      </Text>
    </TouchableOpacity>
  );
};

const styles = (theme: any) =>
  StyleSheet.create({
    link: {
      color: theme.link,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.sm,
    },
  });
