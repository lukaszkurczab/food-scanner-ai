import React, { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type TextButtonTone = "default" | "muted" | "link";
type TextButtonSize = "md" | "sm";

export type TextButtonProps = Pick<
  PressableProps,
  "onPress" | "disabled" | "testID" | "accessibilityRole" | "accessibilityLabel"
> & {
  label: string;
  tone?: TextButtonTone;
  size?: TextButtonSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export const TextButton: React.FC<TextButtonProps> = ({
  label,
  onPress,
  disabled,
  testID,
  accessibilityRole = "button",
  accessibilityLabel,
  tone = "default",
  size = "md",
  style,
  textStyle,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isDisabled = disabled ?? false;

  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        size === "md" ? styles.sizeMd : styles.sizeSm,
        isDisabled ? styles.disabled : null,
        pressed && !isDisabled ? styles.pressed : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.labelBase,
          tone === "muted"
            ? styles.labelMuted
            : tone === "link"
              ? styles.labelLink
              : styles.labelDefault,
          size === "md" ? styles.labelMd : styles.labelSm,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    base: {
      alignSelf: "center",
      justifyContent: "center",
      paddingHorizontal: theme.spacing.md,
    },
    sizeMd: {
      minHeight: 44,
      paddingVertical: theme.spacing.xs,
    },
    sizeSm: {
      minHeight: 32,
      paddingVertical: theme.spacing.xs,
    },
    pressed: {
      opacity: 0.72,
    },
    disabled: {
      opacity: 0.48,
    },
    labelBase: {
      textAlign: "center",
      fontFamily: theme.typography.fontFamily.medium,
    },
    labelDefault: {
      color: theme.textSecondary,
    },
    labelMuted: {
      color: theme.textTertiary,
    },
    labelLink: {
      color: theme.link,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    labelMd: {
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
    },
    labelSm: {
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
    },
  });
