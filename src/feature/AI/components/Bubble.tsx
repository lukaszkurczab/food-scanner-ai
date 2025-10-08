import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  role: "user" | "ai";
  text: string;
  timestamp?: Date;
};

export const Bubble: React.FC<Props> = ({ role, text, timestamp }) => {
  const theme = useTheme();
  const isUser = role === "user";
  const textColor = isUser ? theme.onAccent : theme.text;

  const INLINE_MARK = /\*\*[^*]+\*\*|\*[^*]+\*/g;

  const renderInlineSegments = (content: string, keyPrefix: string) => {
    const segments: Array<{ key: string; value: string; style?: any }> = [];
    let lastIndex = 0;

    content.replace(INLINE_MARK, (match, offset) => {
      if (offset > lastIndex) {
        segments.push({
          key: `${keyPrefix}-${segments.length}`,
          value: content.slice(lastIndex, offset),
        });
      }

      const isBold = match.startsWith("**");
      const inner = match.slice(isBold ? 2 : 1, match.length - (isBold ? 2 : 1));
      segments.push({
        key: `${keyPrefix}-${segments.length}`,
        value: inner,
        style: isBold ? styles.bold : styles.italic,
      });
      lastIndex = offset + match.length;
      return match;
    });

    if (lastIndex < content.length) {
      segments.push({
        key: `${keyPrefix}-${segments.length}`,
        value: content.slice(lastIndex),
      });
    }

    return segments.map((seg) => (
      <Text key={seg.key} style={seg.style}>
        {seg.value}
      </Text>
    ));
  };

  const renderContent = () => {
    const lines = text.split(/\n/);
    return lines.map((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return (
          <Text key={`line-${idx}`} style={[styles.text, { color: textColor }]}> 
          </Text>
        );
      }

      if (/^\s*-\s+/.test(line)) {
        const item = line.replace(/^\s*-\s+/, "");
        return (
          <View key={`bullet-${idx}`} style={styles.bulletRow}>
            <Text style={[styles.text, styles.bulletDot, { color: textColor }]}>•</Text>
            <Text style={[styles.text, { color: textColor, flexShrink: 1 }]}>
              {renderInlineSegments(item, `bullet-${idx}`)}
            </Text>
          </View>
        );
      }

      return (
        <Text key={`line-${idx}`} style={[styles.text, { color: textColor }]}
        >
          {renderInlineSegments(line, `line-${idx}`)}
        </Text>
      );
    });
  };

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
        <View>{renderContent()}</View>
        {timestamp && (
          <Text
            style={[
              styles.time,
              { color: isUser ? theme.onAccent : theme.textSecondary },
            ]}
          >
            {timestamp.toLocaleTimeString([], {
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
  bold: { fontWeight: "700" },
  italic: { fontStyle: "italic" },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  bulletDot: {
    lineHeight: 22,
  },
  time: {
    fontSize: 11,
    marginTop: 6,
    opacity: 0.8,
    alignSelf: "flex-end",
  },
});
