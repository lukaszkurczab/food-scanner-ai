import { memo, useMemo } from "react";
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
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);

  return (
    <View style={[styles.root, style]}>
      <View style={styles.card}>
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

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    root: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
      justifyContent: "center",
    },
    card: {
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      padding: theme.spacing.md,
      shadowOpacity: 0.12,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
      backgroundColor: theme.overlay,
      borderColor: theme.accentSecondary,
      shadowColor: theme.shadow,
    },
    title: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.xs,
      color: theme.text,
    },
    subtitle: {
      fontSize: theme.typography.size.sm,
      lineHeight: theme.typography.lineHeight.tight,
      marginBottom: theme.spacing.sm + theme.spacing.xs,
      color: theme.textSecondary,
    },
    chipsWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    chip: {
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.rounded.full,
      borderWidth: 1,
      backgroundColor: theme.background,
      borderColor: theme.border,
    },
    chipText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.text,
    },
    cta: {
      marginTop: theme.spacing.sm + theme.spacing.xs,
      borderRadius: theme.rounded.sm,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.accentSecondary,
    },
    ctaText: {
      fontSize: theme.typography.size.sm,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.onAccent,
    },
    footer: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.size.xs,
      lineHeight: theme.typography.size.sm,
      color: theme.textSecondary,
    },
  });
