import React, { useMemo } from "react";
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  TextStyle,
  StyleProp,
  GestureResponderEvent,
  TouchableOpacityProps,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type LinkTextProps = {
  children?: React.ReactNode;
  text?: string;
  style?: StyleProp<TextStyle>;
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
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
      accessibilityRole="button"
      {...rest}
    >
      <Text style={[styles.link, disabled ? styles.linkDisabled : null, style]}>
        {children || text}
      </Text>
    </TouchableOpacity>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    link: {
      color: theme.link,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    linkDisabled: {
      opacity: 0.5,
    },
  });
