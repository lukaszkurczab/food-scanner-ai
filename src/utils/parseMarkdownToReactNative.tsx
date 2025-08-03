import React from "react";
import { Text, View } from "react-native";

export const parseMarkdownToReactNative = (text: string, theme: any) => {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;

  lines.forEach((line) => {
    if (/^##\s/.test(line)) {
      elements.push(
        <Text
          key={key++}
          style={{
            fontSize: theme.typography.size.md,
            fontFamily: theme.typography.fontFamily.bold,
            color: theme.text,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.xs,
          }}
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
          style={{
            fontSize: theme.typography.size.xl,
            fontFamily: theme.typography.fontFamily.bold,
            color: theme.text,
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.md,
            textAlign: "center",
          }}
        >
          {line.replace(/^#\s/, "")}
        </Text>
      );
      return;
    }

    if (/^- /.test(line)) {
      let l = line.replace(/^- /, "");
      const bold = l.match(/\*\*(.+?)\*\*/);
      if (bold) {
        const before = l.split("**")[0];
        const boldText = bold[1];
        const after = l.split("**")[2] || "";
        elements.push(
          <View
            key={key++}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: 2,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: theme.typography.size.base,
              }}
            >
              •{" "}
            </Text>
            <Text
              style={{
                color: theme.text,
                fontSize: theme.typography.size.base,
              }}
            >
              {before}
              <Text style={{ fontFamily: theme.typography.fontFamily.bold }}>
                {boldText}
              </Text>
              {after}
            </Text>
          </View>
        );
      } else {
        elements.push(
          <View
            key={key++}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginBottom: 2,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontSize: theme.typography.size.base,
              }}
            >
              •{" "}
            </Text>
            <Text
              style={{
                color: theme.text,
                fontSize: theme.typography.size.base,
              }}
            >
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
        <Text
          key={key++}
          style={{
            color: theme.text,
            fontSize: theme.typography.size.base,
            marginBottom: 2,
          }}
        >
          {before}
          <Text style={{ fontFamily: theme.typography.fontFamily.bold }}>
            {boldText}
          </Text>
          {after}
        </Text>
      );
      return;
    }

    if (line.trim().length > 0) {
      elements.push(
        <Text
          key={key++}
          style={{
            color: theme.text,
            fontSize: theme.typography.size.base,
            marginBottom: 2,
          }}
        >
          {line}
        </Text>
      );
    } else {
      elements.push(<View key={key++} style={{ height: theme.spacing.sm }} />);
    }
  });
  return elements;
};
