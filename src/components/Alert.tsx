import { useMemo } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  GestureResponderEvent,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Button, type ButtonVariant } from "@/components/Button";

type Variant = "info" | "success" | "warning" | "error";

type Action = {
  label: string;
  onPress?: (e: GestureResponderEvent) => void;
  tone?: ButtonVariant;
  loading?: boolean;
  disabled?: boolean;
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

function resolveActionVariant(tone?: Action["tone"]): ButtonVariant {
  if (tone === "destructive") return "destructive";
  if (tone === "secondary") return "secondary";
  if (tone === "ghost") return "ghost";
  return "primary";
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
              <View style={styles.actionItem}>
                <Button
                  label={secondaryAction.label}
                  variant={resolveActionVariant(secondaryAction.tone ?? "secondary")}
                  onPress={
                    secondaryAction.onPress
                      ? () =>
                          secondaryAction.onPress?.(
                            {} as GestureResponderEvent,
                          )
                      : undefined
                  }
                  disabled={secondaryAction.disabled}
                  loading={secondaryAction.loading}
                  testID={secondaryAction.testID}
                />
              </View>
            ) : null}

            {primaryAction ? (
              <View style={styles.actionItem}>
                <Button
                  label={primaryAction.label}
                  variant={resolveActionVariant(primaryAction.tone)}
                  onPress={
                    primaryAction.onPress
                      ? () =>
                          primaryAction.onPress?.({} as GestureResponderEvent)
                      : undefined
                  }
                  disabled={primaryAction.disabled}
                  loading={primaryAction.loading}
                  testID={primaryAction.testID}
                />
              </View>
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
    actionItem: {
      flex: 1,
    },
  });
