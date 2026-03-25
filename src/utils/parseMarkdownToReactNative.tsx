import React from "react";
import { Text, View, StyleSheet } from "react-native";
import type { useTheme } from "@/theme/useTheme";

type Theme = ReturnType<typeof useTheme>;

let cachedTheme: Theme | null = null;
let cachedStyles: ReturnType<typeof makeStyles> | null = null;

const makeStyles = (theme: Theme) => {
  const tightSpacing = theme.spacing.xs / 2;
  return StyleSheet.create({
    headingH2: {
      fontSize: theme.typography.size.bodyM,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.xs,
    },
    headingH1: {
      fontSize: theme.typography.size.h1,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.md,
      textAlign: "center",
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      marginBottom: tightSpacing,
    },
    baseText: {
      color: theme.text,
      fontSize: theme.typography.size.bodyL,
    },
    bold: {
      fontFamily: theme.typography.fontFamily.bold,
    },
    paragraph: {
      color: theme.text,
      fontSize: theme.typography.size.bodyL,
      marginBottom: tightSpacing,
    },
    spacer: { height: theme.spacing.sm },
  });
};

const getStyles = (theme: Theme) => {
  if (cachedTheme === theme && cachedStyles) return cachedStyles;
  cachedTheme = theme;
  cachedStyles = makeStyles(theme);
  return cachedStyles;
};

export const parseMarkdownToReactNative = (text: string, theme: Theme) => {
  const styles = getStyles(theme);
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  lines.forEach((line) => {
    if (/^##\s/.test(line)) {
      elements.push(
        <Text
          key={key++}
          style={styles.headingH2}
        >
          {line.replace(/^##\s/, "")}
        </Text>
      );
      return;
    }
    if (/^#\s/.test(line)) {
      elements.push(
        <Text
          key={key++}
          style={styles.headingH1}
        >
          {line.replace(/^#\s/, "")}
        </Text>
      );
      return;
    }

    if (/^- /.test(line)) {
      const l = line.replace(/^- /, "");
      const bold = l.match(/\*\*(.+?)\*\*/);
      if (bold) {
        const before = l.split("**")[0];
        const boldText = bold[1];
        const after = l.split("**")[2] || "";
        elements.push(
          <View key={key++} style={styles.bulletRow}>
            <Text style={styles.baseText}>• </Text>
            <Text style={styles.baseText}>
              {before}
              <Text style={styles.bold}>
                {boldText}
              </Text>
              {after}
            </Text>
          </View>
        );
      } else {
        elements.push(
          <View key={key++} style={styles.bulletRow}>
            <Text style={styles.baseText}>• </Text>
            <Text style={styles.baseText}>
              {l}
            </Text>
          </View>
        );
      }
      return;
    }

    if (/\*\*(.+?)\*\*/.test(line)) {
      const [before, boldText, after] = line
        .split(/\*\*(.+?)\*\*/)
        .filter(Boolean);
      elements.push(
        <Text key={key++} style={styles.paragraph}>
          {before}
          <Text style={styles.bold}>
            {boldText}
          </Text>
          {after}
        </Text>
      );
      return;
    }

    if (line.trim().length > 0) {
      elements.push(
        <Text key={key++} style={styles.paragraph}>
          {line}
        </Text>
      );
    } else {
      elements.push(<View key={key++} style={styles.spacer} />);
    }
  });
  return elements;
};
