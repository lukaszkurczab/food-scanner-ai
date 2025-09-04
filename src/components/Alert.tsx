import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ActivityIndicator,
  GestureResponderEvent,
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

  const toneBg =
    variant === "error"
      ? theme.error.background
      : variant === "success"
      ? theme.success.background
      : variant === "warning"
      ? theme.warning.background
      : theme.card;

  const toneText =
    variant === "error"
      ? theme.error.text
      : variant === "success"
      ? theme.success.text
      : variant === "warning"
      ? theme.warning.text
      : theme.text;

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
        style={{
          flex: 1,
          backgroundColor: theme.shadow,
          opacity: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
        }}
      >
        <Pressable
          onPress={() => {}}
          style={{
            width: "100%",
            maxWidth: 480,
            borderRadius: 16,
            backgroundColor: toneBg,
            borderWidth: 1,
            borderColor:
              variant === "error"
                ? theme.error.border
                : variant === "warning"
                ? theme.border
                : theme.border,
            shadowColor: theme.shadow,
            shadowOpacity: 0.3,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
            overflow: "hidden",
          }}
        >
          <View style={{ padding: 20, gap: 8 }}>
            <Text
              style={{
                color: toneText,
                fontFamily: theme.typography.fontFamily.bold,
                fontSize: theme.typography.size.lg,
              }}
              numberOfLines={2}
            >
              {title}
            </Text>
            {message ? (
              <Text
                style={{
                  color: variant === "info" ? theme.textSecondary : toneText,
                  fontFamily: theme.typography.fontFamily.regular,
                  fontSize: theme.typography.size.base,
                }}
              >
                {message}
              </Text>
            ) : null}
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              gap: 12,
              paddingHorizontal: 16,
              paddingBottom: 16,
              paddingTop: 4,
            }}
          >
            {secondaryAction ? (
              <Pressable
                disabled={secondaryAction.loading}
                onPress={secondaryAction.onPress}
                testID={secondaryAction.testID}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: theme.border,
                  backgroundColor: theme.card,
                  opacity: secondaryAction.loading ? 0.7 : 1,
                }}
              >
                {secondaryAction.loading ? (
                  <ActivityIndicator />
                ) : (
                  <Text
                    style={{
                      color: theme.text,
                      fontFamily: theme.typography.fontFamily.medium,
                      fontSize: theme.typography.size.base,
                    }}
                  >
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
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  borderRadius: 12,
                  backgroundColor:
                    primaryAction.tone === "destructive"
                      ? theme.error.border
                      : primaryAction.tone === "secondary"
                      ? theme.accentSecondary
                      : theme.accent,
                  opacity: primaryAction.loading ? 0.7 : 1,
                }}
              >
                {primaryAction.loading ? (
                  <ActivityIndicator color={theme.onAccent} />
                ) : (
                  <Text
                    style={{
                      color: theme.onAccent,
                      fontFamily: theme.typography.fontFamily.bold,
                      fontSize: theme.typography.size.base,
                    }}
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
