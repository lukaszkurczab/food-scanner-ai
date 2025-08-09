import React, { useState, useCallback } from "react";
import {
  View,
  TextInput,
  Pressable,
  Text,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";

type Props = {
  placeholder: string;
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
  const [text, setText] = useState("");

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }, [text, disabled, onSend]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.select({ ios: 8, android: 0 })}
    >
      <View
        style={[
          styles.wrapper,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
          },
        ]}
      >
        <View
          style={[
            styles.row,
            {
              backgroundColor: theme.card,
              borderColor: disabled ? theme.disabled.border : theme.border,
              borderRadius: theme.rounded.lg,
            },
          ]}
        >
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={placeholder}
            placeholderTextColor={theme.textSecondary}
            style={[
              styles.input,
              { color: theme.text, fontSize: 16, paddingVertical: 10 },
            ]}
            multiline
            editable={!disabled}
            onSubmitEditing={send}
          />
          <Pressable
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
                borderRadius: theme.rounded.full,
              },
            ]}
          >
            <Text
              style={[
                styles.sendLabel,
                { color: disabled ? theme.disabled.text : theme.onAccent },
              ]}
            >
              Send
            </Text>
          </Pressable>
        </View>

        {!!helperText && (
          <Text
            style={[
              styles.helper,
              { color: disabled ? theme.textSecondary : theme.textSecondary },
            ]}
            numberOfLines={2}
          >
            {helperText}
          </Text>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingLeft: 14,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 132,
    paddingRight: 8,
    alignSelf: "center",
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    margin: 6,
  },
  sendLabel: {
    fontWeight: "600",
    fontSize: 16,
  },
  helper: {
    marginTop: 6,
    fontSize: 13,
  },
});
