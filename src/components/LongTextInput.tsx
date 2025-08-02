import React, { forwardRef } from "react";
import { View, TextInput as RNTextInput, Text } from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  style?: any;
  inputStyle?: any;
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
    const isEditable = editable !== undefined ? editable : !disabled;

    const hasError = !!error;
    const borderColor = hasError
      ? theme.error.border || theme.error.background
      : theme.border || "transparent";
    const borderWidth = hasError ? 1.5 : 1;

    return (
      <View style={[{ width: "100%", position: "relative" }, style]}>
        {label && (
          <Text
            style={{
              color: theme.textSecondary,
              fontSize: theme.typography.size.sm,
              marginBottom: theme.spacing.xs / 2,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
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
            {
              minHeight: Math.max(90, numberOfLines * 22),
              borderRadius: theme.rounded.md,
              borderWidth,
              borderColor,
              backgroundColor: theme.card,
              color: theme.text,
              fontSize: theme.typography.size.base,
              fontFamily: theme.typography.fontFamily.regular,
              padding: theme.spacing.md,
              textAlignVertical: "top",
              shadowColor: theme.shadow,
              shadowOpacity: 0.12,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            },
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
          style={{
            position: "absolute",
            right: theme.spacing.md,
            bottom: theme.spacing.sm,
            color:
              value.length >= maxLength
                ? theme.error.text
                : theme.textSecondary,
            fontSize: theme.typography.size.xs,
            fontFamily: theme.typography.fontFamily.medium,
          }}
        >
          {value.length}/{maxLength}
        </Text>
        {!!error && (
          <Text
            style={{
              color: theme.error.text,
              fontSize: theme.typography.size.xs,
              marginTop: theme.spacing.xs / 2,
              fontFamily: theme.typography.fontFamily.medium,
            }}
          >
            {error}
          </Text>
        )}
      </View>
    );
  }
);
