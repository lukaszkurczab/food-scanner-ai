import React, { memo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

export type EmptyStateSuggestion = {
  label: string;
  value: string;
};

type EmptyStateCta = {
  label: string;
  onPress: () => void;
};

type Props = {
  title: string;
  subtitle?: string;
  suggestions?: EmptyStateSuggestion[];
  disabled?: boolean;
  footerText?: string;
  cta?: EmptyStateCta;
  onPick: (value: string) => void;
  style?: StyleProp<ViewStyle>;
};

export const EmptyState = memo(function EmptyState({
  title,
  subtitle,
  suggestions = [],
  disabled = false,
  footerText,
  cta,
  onPick,
  style,
}: Props) {
  const theme = useTheme();

  return (
    <View style={[styles.root, style]}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.overlay,
            borderColor: theme.accentSecondary,
            shadowColor: theme.shadow,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>

        {!!subtitle && (
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
        )}

        {suggestions.length > 0 && (
          <View style={styles.chipsWrap}>
            {suggestions.map((s) => (
              <Pressable
                key={s.label}
                disabled={disabled}
                onPress={() => onPick(s.value)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.background,
                    borderColor: theme.border,
                    opacity: disabled ? 0.45 : pressed ? 0.85 : 1,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={s.label}
              >
                <Text style={[styles.chipText, { color: theme.text }]}>
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {!!cta && (
          <Pressable
            disabled={disabled}
            onPress={cta.onPress}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: theme.accentSecondary,
                opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={cta.label}
          >
            <Text style={[styles.ctaText, { color: theme.onAccent }]}>
              {cta.label}
            </Text>
          </Pressable>
        )}

        {!!footerText && (
          <Text style={[styles.footer, { color: theme.textSecondary }]}>
            {footerText}
          </Text>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 12,
    justifyContent: "center",
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  cta: {
    marginTop: 14,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "700",
  },
  footer: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 16,
  },
});
