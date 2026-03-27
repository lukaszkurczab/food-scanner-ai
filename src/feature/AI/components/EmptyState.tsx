import { memo, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { Button } from "@/components/Button";
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
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={[styles.root, style]}>
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>

        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

        {suggestions.length > 0 ? (
          <View style={styles.chipsWrap}>
            {suggestions.map((s) => (
              <Pressable
                key={s.label}
                disabled={disabled}
                onPress={() => onPick(s.value)}
                style={({ pressed }) => [
                  styles.chip,
                  disabled ? styles.disabled : null,
                  pressed && !disabled ? styles.pressed : null,
                ]}
                accessibilityRole="button"
                accessibilityLabel={s.label}
              >
                <Text style={styles.chipText}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {cta ? (
          <Button
            label={cta.label}
            onPress={cta.onPress}
            disabled={disabled}
            style={styles.cta}
          />
        ) : null}

        {footerText ? <Text style={styles.footer}>{footerText}</Text> : null}
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
      borderRadius: theme.rounded.lg,
      borderWidth: 1,
      padding: theme.spacing.lg,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.2 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    title: {
      fontSize: theme.typography.size.title,
      lineHeight: theme.typography.lineHeight.title,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.xs,
      color: theme.text,
    },
    subtitle: {
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      marginBottom: theme.spacing.md,
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
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
      backgroundColor: theme.surface,
      borderColor: theme.border,
    },
    chipText: {
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.semiBold,
      color: theme.text,
    },
    cta: {
      marginTop: theme.spacing.md,
    },
    footer: {
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    },
    disabled: {
      opacity: 0.45,
    },
    pressed: {
      opacity: 0.88,
    },
  });
