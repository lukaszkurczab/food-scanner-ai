import React, { useMemo, useState, useCallback } from "react";
import { View, TextInput, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type Props = {
  placeholder?: string;
  disabled?: boolean;
  onSend: (text: string) => void;
  helperText?: string;
  helperActionLabel?: string;
  onHelperActionPress?: () => void;
  helperActionDisabled?: boolean;
};

export const InputBar: React.FC<Props> = ({
  placeholder,
  disabled,
  onSend,
  helperText,
  helperActionLabel,
  onHelperActionPress,
  helperActionDisabled = false,
}) => {
  const theme = useTheme();
  const { t } = useTranslation("chat");
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [text, setText] = useState("");

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }, [text, disabled, onSend]);

  const canSend = !disabled && text.trim().length > 0;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.row, disabled ? styles.rowDisabled : null]}>
        <TextInput
          testID="chat-input"
          value={text}
          onChangeText={setText}
          placeholder={placeholder ?? t("input.placeholder")}
          placeholderTextColor={theme.input.placeholder}
          style={styles.input}
          textAlignVertical="center"
          multiline
          editable={!disabled}
          onSubmitEditing={send}
        />

        <Pressable
          testID="chat-send-button"
          accessibilityRole="button"
          onPress={send}
          disabled={!canSend}
          style={({ pressed }) => [
            styles.sendBtn,
            !canSend ? styles.sendBtnDisabled : null,
            pressed && canSend ? styles.sendBtnPressed : null,
          ]}
        >
          <Text
            style={[
              styles.sendLabel,
              !canSend ? styles.sendLabelDisabled : null,
            ]}
          >
            {t("input.send")}
          </Text>
        </Pressable>
      </View>

      {!!helperText && (
        <View style={styles.helperRow}>
          <Text style={styles.helper} numberOfLines={2}>
            {helperText}
          </Text>

          {!!helperActionLabel && onHelperActionPress && (
            <Pressable
              onPress={onHelperActionPress}
              disabled={helperActionDisabled}
              testID="chat-helper-action"
              style={({ pressed }) => [
                helperActionDisabled ? styles.helperActionDisabled : null,
                pressed && !helperActionDisabled
                  ? styles.helperActionPressed
                  : null,
              ]}
            >
              <Text style={styles.helperAction}>{helperActionLabel}</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.sm + theme.spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.background,
      borderTopColor: theme.border,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-end",
      paddingLeft: theme.spacing.sm,
      borderWidth: 1,
      backgroundColor: theme.input.background,
      borderColor: theme.input.border,
      borderRadius: theme.rounded.lg,
      minHeight: 56,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.14 : 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    rowDisabled: {
      borderColor: theme.disabled.border,
      backgroundColor: theme.input.backgroundDisabled,
    },
    input: {
      flex: 1,
      maxHeight: 132,
      padding: theme.spacing.sm,
      color: theme.input.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
    },
    sendBtn: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      margin: theme.spacing.xs,
      borderRadius: theme.rounded.full,
      backgroundColor: theme.cta.primaryBackground,
      minHeight: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: {
      backgroundColor: theme.disabled.background,
    },
    sendBtnPressed: {
      opacity: 0.84,
    },
    sendLabel: {
      color: theme.cta.primaryText,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
    },
    sendLabelDisabled: {
      color: theme.disabled.text,
    },
    helper: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
      flex: 1,
    },
    helperRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    helperAction: {
      marginTop: theme.spacing.xs,
      color: theme.link,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    helperActionDisabled: {
      opacity: 0.5,
    },
    helperActionPressed: {
      opacity: 0.7,
    },
  });
