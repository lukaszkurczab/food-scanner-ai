import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const MAX_CHARS = 4000;
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";

type Props = {
  placeholder: string;
  sendLabel: string;
  disabled: boolean;
  onSend: (value: string) => void;
  helperText?: string;
  helperActionLabel?: string;
  onHelperActionPress?: () => void;
  helperActionDisabled?: boolean;
};

export function ChatComposer({
  placeholder,
  sendLabel,
  disabled,
  onSend,
  helperText,
  helperActionLabel,
  onHelperActionPress,
  helperActionDisabled = false,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [value, setValue] = useState("");

  const canSend = !disabled && value.trim().length > 0;

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || !canSend) return;
    onSend(trimmed);
    setValue("");
  }, [canSend, onSend, value]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          testID="chat-input"
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={theme.textTertiary}
          style={styles.input}
          editable={!disabled}
          textAlignVertical="center"
          multiline
          maxLength={MAX_CHARS}
          onSubmitEditing={handleSend}
        />

        <Pressable
          testID="chat-send-button"
          onPress={handleSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={sendLabel}
          style={({ pressed }) => [
            styles.sendButton,
            !canSend ? styles.sendButtonDisabled : null,
            pressed && canSend ? styles.sendButtonPressed : null,
          ]}
        >
          <AppIcon
            name="arrow"
            size={16}
            rotation="90deg"
            color={!canSend ? theme.disabled.text : theme.textInverse}
          />
        </Pressable>
      </View>

      {value.length > MAX_CHARS - 400 && (
        <Text
          style={[
            styles.charCounter,
            value.length >= MAX_CHARS && styles.charCounterLimit,
          ]}
        >
          {value.length}/{MAX_CHARS}
        </Text>
      )}

      {helperText ? (
        <View style={styles.helperRow}>
          <Text style={styles.helperText}>{helperText}</Text>

          {helperActionLabel && onHelperActionPress ? (
            <Pressable
              testID="chat-helper-action"
              onPress={onHelperActionPress}
              disabled={helperActionDisabled}
              accessibilityRole="button"
              accessibilityLabel={helperActionLabel}
              style={({ pressed }) => [
                helperActionDisabled ? styles.helperActionDisabled : null,
                pressed && !helperActionDisabled ? styles.helperActionPressed : null,
              ]}
            >
              <Text style={styles.helperActionLabel}>{helperActionLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: {
      borderTopWidth: 1,
      borderTopColor: theme.borderSoft,
      backgroundColor: theme.surfaceElevated,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: 0,
      gap: theme.spacing.xs,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    input: {
      flex: 1,
      minHeight: 48,
      maxHeight: 128,
      borderRadius: theme.rounded.full,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      backgroundColor: theme.surfaceAlt,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.regular,
    },
    sendButton: {
      width: 44,
      height: 44,
      borderRadius: theme.rounded.full,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.primary,
      backgroundColor: theme.primary,
    },
    sendButtonDisabled: {
      borderColor: theme.disabled.border,
      backgroundColor: theme.disabled.background,
    },
    sendButtonPressed: {
      opacity: 0.82,
    },
    helperRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      minHeight: 20,
    },
    helperText: {
      flex: 1,
      color: theme.textTertiary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.regular,
    },
    helperActionLabel: {
      color: theme.link,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.semiBold,
      textDecorationLine: "underline",
    },
    helperActionDisabled: {
      opacity: 0.42,
    },
    helperActionPressed: {
      opacity: 0.72,
    },
    charCounter: {
      fontSize: theme.typography.size.bodyS,
      color: theme.textTertiary,
      alignSelf: "flex-end",
      paddingRight: theme.spacing.xs,
    },
    charCounterLimit: {
      color: theme.status.negative,
    },
  });
