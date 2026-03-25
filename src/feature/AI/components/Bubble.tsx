import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { TextStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  role: "user" | "ai";
  text: string;
  timestamp?: Date;
};

export const Bubble: React.FC<Props> = ({ role, text, timestamp }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isUser = role === "user";
  const textColorStyle = isUser ? styles.textUser : styles.textAi;

  const INLINE_MARK = /\*\*[^*]+\*\*|\*[^*]+\*/g;

  const renderInlineSegments = (content: string, keyPrefix: string) => {
    const segments: Array<{ key: string; value: string; style?: TextStyle }> =
      [];
    let lastIndex = 0;

    content.replace(INLINE_MARK, (match, offset) => {
      if (offset > lastIndex) {
        segments.push({
          key: `${keyPrefix}-${segments.length}`,
          value: content.slice(lastIndex, offset),
        });
      }

      const isBold = match.startsWith("**");
      const inner = match.slice(
        isBold ? 2 : 1,
        match.length - (isBold ? 2 : 1),
      );

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
          <Text key={`line-${idx}`} style={[styles.text, textColorStyle]} />
        );
      }

      if (/^\s*-\s+/.test(line)) {
        const item = line.replace(/^\s*-\s+/, "");
        return (
          <View key={`bullet-${idx}`} style={styles.bulletRow}>
            <Text style={[styles.text, styles.bulletDot, textColorStyle]}>
              •
            </Text>
            <Text style={[styles.text, textColorStyle, styles.bulletText]}>
              {renderInlineSegments(item, `bullet-${idx}`)}
            </Text>
          </View>
        );
      }

      return (
        <Text key={`line-${idx}`} style={[styles.text, textColorStyle]}>
          {renderInlineSegments(line, `line-${idx}`)}
        </Text>
      );
    });
  };

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowAi]}>
      <View
        style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAi]}
      >
        <View>{renderContent()}</View>

        {timestamp ? (
          <Text style={[styles.time, isUser ? styles.timeUser : styles.timeAi]}>
            {timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      width: "100%",
      marginVertical: theme.spacing.sm,
      flexDirection: "row",
    },
    rowUser: {
      justifyContent: "flex-end",
    },
    rowAi: {
      justifyContent: "flex-start",
    },
    bubble: {
      maxWidth: "82%",
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.2 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    bubbleUser: {
      backgroundColor: theme.cta.primaryBackground,
      borderTopLeftRadius: theme.rounded.md,
      borderTopRightRadius: theme.rounded.sm,
      borderBottomLeftRadius: theme.rounded.md,
      borderBottomRightRadius: theme.rounded.md,
    },
    bubbleAi: {
      backgroundColor: theme.surfaceElevated,
      borderTopLeftRadius: theme.rounded.sm,
      borderTopRightRadius: theme.rounded.md,
      borderBottomLeftRadius: theme.rounded.md,
      borderBottomRightRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.borderSoft,
    },
    text: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
    },
    textUser: {
      color: theme.cta.primaryText,
    },
    textAi: {
      color: theme.text,
    },
    bold: {
      fontFamily: theme.typography.fontFamily.bold,
    },
    italic: {
      fontStyle: "italic",
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
    },
    bulletText: {
      flexShrink: 1,
    },
    bulletDot: {
      lineHeight: theme.typography.lineHeight.bodyL,
    },
    time: {
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      marginTop: theme.spacing.xs,
      opacity: 0.8,
      alignSelf: "flex-end",
      fontFamily: theme.typography.fontFamily.medium,
    },
    timeUser: {
      color: theme.cta.primaryText,
    },
    timeAi: {
      color: theme.textSecondary,
    },
  });
