import { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  GestureResponderEvent,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type Variant = "info" | "success" | "warning" | "error";

type Action = {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  tone?: "primary" | "secondary" | "destructive";
  loading?: boolean;
  testID?: string;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  variant?: Variant;
  primaryAction?: Action;
  secondaryAction?: Action;
  onClose?: () => void;
  dismissOnBackdrop?: boolean;
  testID?: string;
};

const MODAL_MAX_WIDTH = 480;

function getVariantColors(
  theme: ReturnType<typeof useTheme>,
  variant: Variant,
) {
  if (variant === "error") {
    return {
      background: theme.error.surface,
      border: theme.error.border,
      title: theme.error.text,
      message: theme.error.text,
    };
  }

  if (variant === "success") {
    return {
      background: theme.success.surface,
      border: theme.border,
      title: theme.success.text,
      message: theme.success.text,
    };
  }

  if (variant === "warning") {
    return {
      background: theme.warning.surface,
      border: theme.border,
      title: theme.warning.text,
      message: theme.warning.text,
    };
  }

  return {
    background: theme.surface,
    border: theme.border,
    title: theme.text,
    message: theme.textSecondary,
  };
}

function getPrimaryActionBackground(
  theme: ReturnType<typeof useTheme>,
  tone?: Action["tone"],
) {
  if (tone === "destructive") return theme.cta.destructiveBackground;
  if (tone === "secondary") return theme.cta.secondaryBackground;
  return theme.cta.primaryBackground;
}

function getPrimaryActionTextColor(
  theme: ReturnType<typeof useTheme>,
  tone?: Action["tone"],
) {
  if (tone === "destructive") return theme.cta.destructiveText;
  if (tone === "secondary") return theme.cta.secondaryText;
  return theme.cta.primaryText;
}

export function Alert({
  visible,
  title,
  message,
  variant = "info",
  primaryAction,
  secondaryAction,
  onClose,
  dismissOnBackdrop = true,
  testID,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const tone = useMemo(
    () => getVariantColors(theme, variant),
    [theme, variant],
  );
  const primaryActionBackground = getPrimaryActionBackground(
    theme,
    primaryAction?.tone,
  );
  const primaryActionTextColor = getPrimaryActionTextColor(
    theme,
    primaryAction?.tone,
  );
  const primaryActionBorderColor =
    primaryAction?.tone === "secondary"
      ? theme.cta.secondaryBorder
      : "transparent";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      testID={testID}
    >
      <Pressable
        onPress={dismissOnBackdrop ? onClose : undefined}
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
      >
        <Pressable
          onPress={() => {}}
          style={[
            styles.card,
            {
              backgroundColor: tone.background,
              borderColor: tone.border,
              shadowColor: theme.shadow,
            },
          ]}
        >
          <View style={styles.content}>
            <Text
              style={[styles.title, { color: tone.title }]}
              numberOfLines={2}
            >
              {title}
            </Text>

            {message ? (
              <Text style={[styles.message, { color: tone.message }]}>
                {message}
              </Text>
            ) : null}
          </View>

          <View style={styles.actionsRow}>
            {secondaryAction ? (
              <Pressable
                disabled={secondaryAction.loading}
                onPress={secondaryAction.onPress}
                testID={secondaryAction.testID}
                style={[
                  styles.actionButton,
                  styles.secondaryAction,
                  secondaryAction.loading && styles.actionDisabled,
                ]}
              >
                {secondaryAction.loading ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <Text style={styles.secondaryActionText}>
                    {secondaryAction.label}
                  </Text>
                )}
              </Pressable>
            ) : null}

            {primaryAction ? (
              <Pressable
                disabled={primaryAction.loading}
                onPress={primaryAction.onPress}
                testID={primaryAction.testID}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: primaryActionBackground,
                    borderColor: primaryActionBorderColor,
                  },
                  primaryAction.tone === "secondary" &&
                    styles.secondaryToneButton,
                  primaryAction.loading && styles.actionDisabled,
                ]}
              >
                {primaryAction.loading ? (
                  <ActivityIndicator color={primaryActionTextColor} />
                ) : (
                  <Text
                    style={[
                      styles.primaryActionText,
                      { color: primaryActionTextColor },
                    ]}
                  >
                    {primaryAction.label}
                  </Text>
                )}
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
    },
    card: {
      width: "100%",
      maxWidth: MODAL_MAX_WIDTH,
      borderRadius: theme.rounded.lg,
      borderWidth: 1,
      shadowOpacity: theme.isDark ? 0.24 : 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 4,
      overflow: "hidden",
    },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    title: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.h2,
      lineHeight: theme.typography.lineHeight.h2,
    },
    message: {
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.lg,
      paddingTop: theme.spacing.xs,
    },
    actionButton: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryToneButton: {
      backgroundColor: theme.cta.secondaryBackground,
    },
    actionDisabled: {
      opacity: 0.7,
    },
    secondaryAction: {
      borderWidth: 1,
      borderColor: theme.cta.secondaryBorder,
      backgroundColor: theme.cta.secondaryBackground,
    },
    secondaryActionText: {
      color: theme.cta.secondaryText,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
    },
    primaryActionText: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
    },
  });
