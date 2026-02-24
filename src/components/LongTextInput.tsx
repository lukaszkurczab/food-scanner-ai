import { forwardRef, useMemo } from "react";
import { View, TextInput as RNTextInput, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import type { ViewStyle, TextStyle } from "react-native";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  disabled?: boolean;
  editable?: boolean;
  numberOfLines?: number;
  onBlur?: () => void;
  onFocus?: () => void;
  maxLength?: number;
};

const DEFAULT_MAX_LENGTH = 250;

export const LongTextInput = forwardRef<RNTextInput, Props>(
  (
    {
      value,
      onChangeText,
      placeholder,
      label,
      error,
      style,
      inputStyle,
      disabled = false,
      editable,
      numberOfLines = 4,
      onBlur,
      onFocus,
      maxLength = DEFAULT_MAX_LENGTH,
    },
    ref
  ) => {
    const theme = useTheme();
    const styles = useMemo(() => makeStyles(theme), [theme.mode]);
    const isEditable = editable !== undefined ? editable : !disabled;

    const hasError = !!error;
    const borderColor = hasError
      ? theme.error.border || theme.error.background
      : theme.border || "transparent";
    const borderWidth = hasError ? 1.5 : 1;
    const minHeight = Math.max(90, numberOfLines * 22);
    const inputDynamicStyle = useMemo(
      () => ({
        minHeight,
        borderWidth,
        borderColor,
      }),
      [minHeight, borderWidth, borderColor]
    );
    const counterColorStyle = useMemo(
      () => ({
        color:
          value.length >= maxLength
            ? theme.error.text
            : theme.textSecondary,
      }),
      [value.length, maxLength, theme.error.text, theme.textSecondary]
    );

    return (
      <View style={[styles.container, style]}>
        {label && (
          <Text style={styles.label}>
            {label}
          </Text>
        )}
        <RNTextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          editable={isEditable}
          style={[
            styles.input,
            inputDynamicStyle,
            inputStyle,
          ]}
          multiline
          numberOfLines={numberOfLines}
          onBlur={onBlur}
          onFocus={onFocus}
          selectionColor={theme.accent}
          underlineColorAndroid="transparent"
          maxLength={maxLength}
        />
        <Text
          style={[styles.counter, counterColorStyle]}
        >
          {value.length}/{maxLength}
        </Text>
        {!!error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

LongTextInput.displayName = "LongTextInput";

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      width: "100%",
      position: "relative",
    },
    label: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      marginBottom: theme.spacing.xs / 2,
      fontFamily: theme.typography.fontFamily.medium,
    },
    input: {
      borderRadius: theme.rounded.md,
      backgroundColor: theme.card,
      color: theme.text,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.regular,
      padding: theme.spacing.md,
      textAlignVertical: "top",
      shadowColor: theme.shadow,
      shadowOpacity: 0.12,
      shadowRadius: theme.spacing.sm,
      shadowOffset: { width: 0, height: theme.spacing.xs / 2 },
      elevation: 3,
    },
    counter: {
      position: "absolute",
      right: theme.spacing.md,
      bottom: theme.spacing.sm,
      fontSize: theme.typography.size.xs,
      fontFamily: theme.typography.fontFamily.medium,
    },
    errorText: {
      color: theme.error.text,
      fontSize: theme.typography.size.xs,
      marginTop: theme.spacing.xs / 2,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });
