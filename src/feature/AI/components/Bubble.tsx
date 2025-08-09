import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ChatMessage } from "@/src/types";
import { useTheme } from "@/src/theme/useTheme";

type Props = {
  msg: ChatMessage;
};

export const Bubble: React.FC<Props> = ({ msg }) => {
  const theme = useTheme();
  const isUser = msg.role === "user";

  return (
    <View
      style={[
        styles.row,
        {
          justifyContent: isUser ? "flex-end" : "flex-start",
        },
      ]}
    >
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? theme.accentSecondary : theme.card,
            borderTopLeftRadius: isUser ? theme.rounded.md : theme.rounded.sm,
            borderTopRightRadius: isUser ? theme.rounded.sm : theme.rounded.md,
            borderBottomLeftRadius: theme.rounded.md,
            borderBottomRightRadius: theme.rounded.md,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <Text
          style={[styles.text, { color: isUser ? theme.onAccent : theme.text }]}
        >
          {msg.content}
        </Text>
        {!!msg.createdAt && (
          <Text
            style={[
              styles.time,
              { color: isUser ? theme.onAccent : theme.textSecondary },
            ]}
          >
            {new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { width: "100%", marginVertical: 8, flexDirection: "row" },
  bubble: {
    maxWidth: "82%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 2,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  time: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.8,
    alignSelf: "flex-end",
  },
});
