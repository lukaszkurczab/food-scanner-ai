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
    ref,
  ) => {
    const theme = useTheme();
    const styles = useMemo(() => makeStyles(theme), [theme]);
    const isEditable = editable !== undefined ? editable : !disabled;

    const hasError = !!error;
    const minHeight = Math.max(96, numberOfLines * 24 + 24);

    const inputDynamicStyle = useMemo(
      () => ({
        minHeight,
        borderWidth: 1,
        borderColor: hasError ? theme.input.borderError : theme.input.border,
        backgroundColor: isEditable
          ? theme.input.background
          : theme.input.backgroundDisabled,
      }),
      [
        minHeight,
        hasError,
        isEditable,
        theme.input.background,
        theme.input.backgroundDisabled,
        theme.input.border,
        theme.input.borderError,
      ],
    );

    const counterColorStyle = useMemo(
      () => ({
        color:
          value.length >= maxLength ? theme.error.text : theme.textSecondary,
      }),
      [value.length, maxLength, theme.error.text, theme.textSecondary],
    );

    return (
      <View style={[styles.container, style]}>
        {label ? <Text style={styles.label}>{label}</Text> : null}

        <RNTextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          autoCorrect={false}
          spellCheck={false}
          placeholder={placeholder}
          placeholderTextColor={theme.input.placeholder}
          editable={isEditable}
          style={[styles.input, inputDynamicStyle, inputStyle]}
          multiline
          numberOfLines={numberOfLines}
          onBlur={onBlur}
          onFocus={onFocus}
          selectionColor={theme.primary}
          underlineColorAndroid="transparent"
          maxLength={maxLength}
        />

        <Text style={[styles.counter, counterColorStyle]}>
          {value.length}/{maxLength}
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>
    );
  },
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
      fontSize: theme.typography.size.labelL,
      lineHeight: theme.typography.lineHeight.labelL,
      marginBottom: theme.spacing.xs,
      fontFamily: theme.typography.fontFamily.medium,
    },
    input: {
      borderRadius: theme.rounded.md,
      color: theme.input.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
      textAlignVertical: "top",
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.16 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    counter: {
      position: "absolute",
      right: theme.spacing.md,
      bottom: theme.spacing.sm,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.medium,
    },
    errorText: {
      color: theme.error.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      marginTop: theme.spacing.xs,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });
