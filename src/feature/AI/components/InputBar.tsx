import React, { useMemo, useState, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type Props = {
  placeholder?: string;
  disabled?: boolean;
  onSend: (text: string) => void;
  helperText?: string;
};

export const InputBar: React.FC<Props> = ({
  placeholder,
  disabled,
  onSend,
  helperText,
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

  return (
    <View style={styles.wrapper}>
      <View style={[styles.row, disabled && styles.rowDisabled]}>
        <TextInput
          testID="chat-input"
          value={text}
          onChangeText={setText}
          placeholder={placeholder ?? t("input.placeholder")}
          placeholderTextColor={theme.textSecondary}
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
          disabled={disabled}
          style={({ pressed }) => [
            styles.sendBtn,
            {
              backgroundColor: disabled
                ? theme.disabled.background
                : theme.accentSecondary,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.sendLabel,
              { color: disabled ? theme.disabled.text : theme.onAccent },
            ]}
          >
            {t("input.send")}
          </Text>
        </Pressable>
      </View>

      {!!helperText && (
        <Text style={styles.helper} numberOfLines={2}>
          {helperText}
        </Text>
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
      alignItems: "center",
      paddingLeft: theme.spacing.sm,
      borderWidth: 1,
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: theme.rounded.lg,
    },
    rowDisabled: {
      borderColor: theme.disabled.border,
    },
    input: {
      flex: 1,
      maxHeight: 132,
      padding: theme.spacing.sm,
      color: theme.text,
      fontSize: theme.typography.size.base,
    },
    sendBtn: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      margin: theme.spacing.xs,
      borderRadius: theme.rounded.full,
    },
    sendLabel: {
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.base,
    },
    helper: {
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.sm,
      color: theme.textSecondary,
    },
  });
