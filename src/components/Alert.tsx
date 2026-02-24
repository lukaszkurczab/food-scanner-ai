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

function getVariantColors(theme: ReturnType<typeof useTheme>, variant: Variant) {
  if (variant === "error") {
    return {
      background: theme.error.background,
      border: theme.error.border,
      title: theme.error.text,
      message: theme.error.text,
    };
  }

  if (variant === "success") {
    return {
      background: theme.success.background,
      border: theme.border,
      title: theme.success.text,
      message: theme.success.text,
    };
  }

  if (variant === "warning") {
    return {
      background: theme.warning.background,
      border: theme.border,
      title: theme.warning.text,
      message: theme.warning.text,
    };
  }

  return {
    background: theme.card,
    border: theme.border,
    title: theme.text,
    message: theme.textSecondary,
  };
}

function getPrimaryActionBackground(
  theme: ReturnType<typeof useTheme>,
  tone?: Action["tone"]
) {
  if (tone === "destructive") return theme.error.border;
  if (tone === "secondary") return theme.accentSecondary;
  return theme.accent;
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
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);

  const tone = useMemo(() => getVariantColors(theme, variant), [theme.mode, variant]);
  const primaryActionBackground = getPrimaryActionBackground(
    theme,
    primaryAction?.tone
  );

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
        style={[styles.backdrop, { backgroundColor: theme.shadow }]}
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
                  { backgroundColor: primaryActionBackground },
                  primaryAction.loading && styles.actionDisabled,
                ]}
              >
                {primaryAction.loading ? (
                  <ActivityIndicator color={theme.onAccent} />
                ) : (
                  <Text style={styles.primaryActionText}>
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
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      shadowOpacity: 0.3,
      shadowRadius: theme.rounded.md,
      shadowOffset: { width: 0, height: theme.spacing.sm },
      elevation: theme.spacing.sm,
      overflow: "hidden",
    },
    content: {
      padding: theme.spacing.container,
      gap: theme.spacing.sm,
    },
    title: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.lg,
    },
    message: {
      fontFamily: theme.typography.fontFamily.regular,
      fontSize: theme.typography.size.base,
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      paddingTop: theme.spacing.xs,
    },
    actionButton: {
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.rounded.sm + theme.spacing.xs,
    },
    actionDisabled: {
      opacity: 0.7,
    },
    secondaryAction: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    secondaryActionText: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.base,
    },
    primaryActionText: {
      color: theme.onAccent,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.base,
    },
  });
