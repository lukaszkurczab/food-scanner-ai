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
  spellCheck?: boolean;
  returnKeyType?: TextInputProps["returnKeyType"];
  onSubmitEditing?: () => void;
  rightLabel?: string;
  maxLength?: number;
  testID?: string;
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
  autoCorrect = false,
  spellCheck,
  returnKeyType,
  onSubmitEditing,
  onEndEditing,
  rightLabel,
  maxLength = 128,
  testID,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = !!error;
  const errorMsg = typeof error === "string" ? error : undefined;
  const iconSize = 22;
  const isEditable = editable !== undefined ? editable : !disabled;
  const resolvedSpellCheck = spellCheck ?? autoCorrect;
  const inputMinHeight = multiline ? Math.max(48, numberOfLines * 24) : 52;

  const borderColor = hasError
    ? theme.input.borderError
    : isFocused
      ? theme.primary
      : theme.input.border;

  const iconColor = hasError ? theme.error.text : theme.textSecondary;

  const inputPaddingLeft =
    icon && iconPosition === "left"
      ? theme.spacing.md + iconSize + theme.spacing.xs
      : theme.spacing.md;

  const inputPaddingRight =
    icon && iconPosition === "right"
      ? theme.spacing.md + iconSize + theme.spacing.xs
      : rightLabel
        ? theme.spacing.xl + theme.spacing.md
        : theme.spacing.md;

  const inputWrapperDynamicStyle = useMemo(
    () => ({
      backgroundColor: isEditable
        ? theme.input.background
        : theme.input.backgroundDisabled,
      borderColor,
      alignItems: multiline ? "flex-start" : "center",
      minHeight: inputMinHeight,
      opacity: !isEditable ? 0.7 : 1,
    }),
    [
      isEditable,
      theme.input.background,
      theme.input.backgroundDisabled,
      borderColor,
      multiline,
      inputMinHeight,
    ],
  );

  const textInputDynamicStyle = useMemo<TextStyle>(
    () => ({
      paddingLeft: inputPaddingLeft,
      paddingRight: inputPaddingRight,
      textAlignVertical: multiline ? "top" : "center",
      minHeight: inputMinHeight,
    }),
    [inputPaddingLeft, inputPaddingRight, multiline, inputMinHeight],
  );

  const focusShadowStyle =
    isFocused && !hasError
      ? Platform.select({
          ios: {
            shadowColor: "#000000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: theme.isDark ? 0.18 : 0.08,
            shadowRadius: 8,
          },
          android: {
            elevation: 3,
          },
        })
      : {};

  return (
    <View style={[styles.container, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          inputWrapperDynamicStyle,
          focusShadowStyle,
        ]}
      >
        {icon && iconPosition === "left" ? (
          <View style={styles.iconLeft}>
            {React.cloneElement(icon, {
              size: icon.props.size ?? iconSize,
              color: icon.props.color ?? iconColor,
            })}
          </View>
        ) : null}

        <RNTextInput
          testID={testID}
          autoCorrect={autoCorrect}
          spellCheck={resolvedSpellCheck}
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
          placeholderTextColor={theme.input.placeholder}
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
          style={[styles.input, textInputDynamicStyle, inputStyle]}
          selectionColor={theme.primary}
          underlineColorAndroid="transparent"
        />

        {rightLabel ? (
          <Text style={styles.rightLabel}>{rightLabel}</Text>
        ) : null}

        {icon && iconPosition === "right" ? (
          <View style={styles.iconRight}>
            {React.cloneElement(icon, {
              size: icon.props.size ?? iconSize,
              color: icon.props.color ?? iconColor,
            })}
          </View>
        ) : null}
      </View>

      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
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
      fontSize: theme.typography.size.labelL,
      lineHeight: theme.typography.lineHeight.labelL,
      marginBottom: theme.spacing.xs,
      fontFamily: theme.typography.fontFamily.medium,
    },
    inputWrapper: {
      width: "100%",
      position: "relative",
      overflow: "hidden",
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      flexDirection: "row",
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.isDark ? 0.16 : 0.08,
      shadowRadius: 8,
      elevation: 2,
    },
    input: {
      flex: 1,
      color: theme.input.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      paddingVertical: theme.spacing.sm,
    },
    rightLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      marginLeft: theme.spacing.sm,
      fontFamily: theme.typography.fontFamily.medium,
      marginRight: theme.spacing.md,
      alignSelf: "center",
    },
    errorText: {
      color: theme.error.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      marginTop: theme.spacing.xs,
      fontFamily: theme.typography.fontFamily.medium,
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
