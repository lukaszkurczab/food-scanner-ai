import React, { useMemo, useState } from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  KeyboardTypeOptions,
  TextInputProps,
  Platform,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  icon?: React.ReactElement<{ size?: number; color?: string }>;
  onBlur?: () => void;
  onFocus?: () => void;
  iconPosition?: "left" | "right";
  error?: boolean | string;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
  inputStyle?: TextStyle;
  onEndEditing?: () => void;
  disabled?: boolean;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?: TextInputProps["autoComplete"];
  textContentType?: TextInputProps["textContentType"];
  accessibilityLabel?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  ref?: React.Ref<RNTextInput>;
  autoCorrect?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  rightLabel?: string;
  maxLength?: number;
};

export const TextInput: React.FC<Props> = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  secureTextEntry = false,
  icon,
  iconPosition = "left",
  error,
  onBlur,
  onFocus,
  multiline = false,
  numberOfLines = 1,
  style,
  inputStyle,
  disabled = false,
  editable,
  autoCapitalize,
  autoComplete,
  textContentType,
  accessibilityLabel,
  ref,
  autoCorrect = true,
  returnKeyType,
  onSubmitEditing,
  onEndEditing,
  rightLabel,
  maxLength = 128,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const [isFocused, setIsFocused] = useState(false);

  const inputBg =
    theme.card ||
    (theme.mode === "dark" ? theme.background + "E6" : theme.background);

  const hasError = !!error;
  const errorMsg = typeof error === "string" ? error : undefined;

  const borderColor = hasError
    ? theme.error.border || theme.error.background
    : isFocused
    ? theme.accentSecondary
    : theme.border || "transparent";

  const borderWidth = hasError ? 1.5 : 1;

  const iconColor = hasError ? theme.error.text : theme.textSecondary;
  const iconSize = 22;

  const inputPaddingLeft =
    icon && iconPosition === "left"
      ? theme.spacing.lg + iconSize
      : theme.spacing.md;
  const inputPaddingRight =
    icon && iconPosition === "right"
      ? theme.spacing.lg + iconSize
      : theme.spacing.md;

  const isEditable = editable !== undefined ? editable : !disabled;
  const inputMinHeight = multiline ? Math.max(48, numberOfLines * 24) : 48;
  const inputWrapperDynamicStyle = useMemo(
    () => ({
      backgroundColor: inputBg,
      borderColor,
      borderWidth,
      alignItems: multiline ? "flex-start" : "center",
      minHeight: inputMinHeight,
      opacity: !isEditable ? 0.7 : 1,
    }),
    [inputBg, borderColor, borderWidth, multiline, inputMinHeight, isEditable]
  );
  const textInputDynamicStyle = useMemo<TextStyle>(
    () => ({
      paddingLeft: inputPaddingLeft,
      paddingRight: inputPaddingRight,
      textAlignVertical: multiline
        ? ("top" as const)
        : ("center" as const),
      minHeight: inputMinHeight,
    }),
    [inputPaddingLeft, inputPaddingRight, multiline, inputMinHeight]
  );

  const focusShadowStyle =
    isFocused && !hasError
      ? Platform.select({
          ios: {
            shadowColor: theme.accentSecondary,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          },
          android: {
            elevation: 3,
          },
        })
      : {};

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text style={styles.label}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          inputWrapperDynamicStyle,
          focusShadowStyle,
        ]}
      >
        {icon && iconPosition === "left" && (
          <View style={styles.iconLeft}>
            {React.cloneElement(icon, {
              size: icon.props.size ?? iconSize,
              color: icon.props.color ?? iconColor,
            })}
          </View>
        )}

        <RNTextInput
          autoCorrect={autoCorrect}
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          onFocus={() => {
            setIsFocused(true);
            onFocus?.();
          }}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          editable={isEditable}
          onEndEditing={onEndEditing}
          multiline={multiline}
          numberOfLines={numberOfLines}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          textContentType={textContentType}
          accessibilityLabel={accessibilityLabel}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
          style={[
            styles.input,
            textInputDynamicStyle,
            inputStyle,
          ]}
          selectionColor={theme.accent}
          underlineColorAndroid="transparent"
        />

        {!!rightLabel && (
          <Text style={styles.rightLabel}>
            {rightLabel}
          </Text>
        )}

        {icon && iconPosition === "right" && (
          <View style={styles.iconRight}>
            {React.cloneElement(icon, {
              size: icon.props.size ?? iconSize,
              color: icon.props.color ?? iconColor,
            })}
          </View>
        )}
      </View>
      {!!errorMsg && (
        <Text style={styles.errorText}>
          {errorMsg}
        </Text>
      )}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      width: "100%",
    },
    label: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      marginBottom: theme.spacing.xs / 2,
      fontFamily: theme.typography.fontFamily.medium,
    },
    inputWrapper: {
      width: "100%",
      position: "relative",
      overflow: "hidden",
      shadowOffset: { width: 1, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 2,
      elevation: 3,
      borderRadius: theme.rounded.sm,
      flexDirection: "row",
      shadowColor: theme.shadow,
    },
    input: {
      flex: 1,
      color: theme.text,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.regular,
      paddingVertical: theme.spacing.sm,
    },
    rightLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.base,
      marginLeft: theme.spacing.sm,
      fontFamily: theme.typography.fontFamily.medium,
      marginRight: theme.spacing.md,
    },
    errorText: {
      color: theme.error.text,
      fontSize: theme.typography.size.xs,
      marginTop: theme.spacing.xs / 2,
      fontFamily: theme.typography.fontFamily.medium,
      letterSpacing: 0.1,
    },
    iconLeft: {
      position: "absolute",
      left: theme.spacing.md - theme.spacing.xs,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
    iconRight: {
      position: "absolute",
      right: theme.spacing.md - theme.spacing.xs,
      top: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 2,
    },
  });
