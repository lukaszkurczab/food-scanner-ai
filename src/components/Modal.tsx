import React, { useMemo } from "react";
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { IconButton } from "@/components/IconButton";
import AppIcon from "@/components/AppIcon";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const MODAL_MAX_WIDTH = 500;

export type ModalActionTone = "primary" | "secondary" | "destructive";

export type ModalAction = {
  label: string;
  onPress?: () => void;
  tone?: ModalActionTone;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
};

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onClose?: () => void;
  fullScreen?: boolean;
  footer?: React.ReactNode;
  stackActions?: boolean;
  contentPaddingBottom?: number;
  closeOnBackdropPress?: boolean;
};

export const Modal: React.FC<Props> = ({
  visible,
  title,
  message,
  children,
  primaryAction,
  secondaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onClose,
  fullScreen = false,
  footer,
  stackActions = false,
  contentPaddingBottom,
  closeOnBackdropPress = true,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const modalBackground = theme.surfaceElevated;
  const contentBottomPadding = contentPaddingBottom ?? theme.spacing.lg;
  const resolvedPrimaryAction = primaryAction ?? (
    primaryActionLabel
      ? {
          label: primaryActionLabel,
          onPress: onPrimaryAction,
        }
      : undefined
  );
  const resolvedSecondaryAction = secondaryAction ?? (
    secondaryActionLabel
      ? {
          label: secondaryActionLabel,
          onPress: onSecondaryAction,
        }
      : undefined
  );

  const handleBackdropPress = () => {
    if (!closeOnBackdropPress) return;
    onClose?.();
  };

  const actionsSideBySide =
    !fullScreen &&
    !stackActions &&
    !!resolvedPrimaryAction &&
    !!resolvedSecondaryAction;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={fullScreen ? "slide" : "fade"}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        <View
          style={[
            styles.centeredView,
            fullScreen && styles.centeredViewFullscreen,
          ]}
          pointerEvents="box-none"
        >
          <TouchableWithoutFeedback onPress={handleBackdropPress}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: modalBackground,
                borderColor: theme.border,
                width: fullScreen ? "95%" : "90%",
                maxHeight: fullScreen
                  ? WINDOW_HEIGHT * 0.96
                  : WINDOW_HEIGHT * 0.8,
                marginTop: fullScreen ? theme.spacing.nav : 0,
              },
              fullScreen && styles.modalContainerFullScreen,
            ]}
          >
            {onClose ? (
              <View style={styles.closeButton}>
                <IconButton
                  icon={
                    <AppIcon
                      name="close"
                      size={20}
                      color={theme.textSecondary}
                    />
                  }
                  onPress={onClose}
                  size={32}
                  iconColor={theme.textSecondary}
                  accessibilityLabel="Close"
                />
              </View>
            ) : null}

            {title ? <Text style={styles.title}>{title}</Text> : null}

            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: contentBottomPadding },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {children ? (
                children
              ) : message ? (
                <Text style={styles.message}>{message}</Text>
              ) : null}
            </ScrollView>

            {footer ? (
              <View style={styles.footer}>{footer}</View>
            ) : resolvedPrimaryAction || resolvedSecondaryAction ? (
              actionsSideBySide ? (
                <GlobalActionButtons
                  label={resolvedPrimaryAction?.label ?? ""}
                  onPress={resolvedPrimaryAction?.onPress}
                  loading={resolvedPrimaryAction?.loading}
                  disabled={resolvedPrimaryAction?.disabled}
                  testID={resolvedPrimaryAction?.testID}
                  tone={resolvedPrimaryAction?.tone ?? "primary"}
                  secondaryLabel={resolvedSecondaryAction?.label}
                  secondaryOnPress={resolvedSecondaryAction?.onPress}
                  secondaryLoading={resolvedSecondaryAction?.loading}
                  secondaryDisabled={resolvedSecondaryAction?.disabled}
                  secondaryTestID={resolvedSecondaryAction?.testID}
                  secondaryTone={resolvedSecondaryAction?.tone ?? "secondary"}
                  layout="row"
                  rowOrder="secondary-primary"
                  containerStyle={styles.actionsRow}
                />
              ) : (
                <GlobalActionButtons
                  label={resolvedPrimaryAction?.label ?? ""}
                  onPress={resolvedPrimaryAction?.onPress}
                  loading={resolvedPrimaryAction?.loading}
                  disabled={resolvedPrimaryAction?.disabled}
                  testID={resolvedPrimaryAction?.testID}
                  tone={resolvedPrimaryAction?.tone ?? "primary"}
                  secondaryLabel={resolvedSecondaryAction?.label}
                  secondaryOnPress={resolvedSecondaryAction?.onPress}
                  secondaryLoading={resolvedSecondaryAction?.loading}
                  secondaryDisabled={resolvedSecondaryAction?.disabled}
                  secondaryTestID={resolvedSecondaryAction?.testID}
                  secondaryTone={resolvedSecondaryAction?.tone ?? "secondary"}
                  containerStyle={styles.actionsColumn}
                />
              )
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.overlay,
      zIndex: 0,
    },
    keyboardAvoiding: {
      flex: 1,
      justifyContent: "center",
    },
    centeredView: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    centeredViewFullscreen: {
      minHeight: WINDOW_HEIGHT,
      justifyContent: "flex-start",
    },
    modalContainer: {
      alignSelf: "center",
      minWidth: 260,
      maxWidth: MODAL_MAX_WIDTH,
      position: "relative",
      borderWidth: 1,
      borderRadius: theme.rounded.lg,
      padding: theme.spacing.lg,
      elevation: 10,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.28 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
    },
    modalContainerFullScreen: {
      flex: 1,
      width: "98%",
    },
    closeButton: {
      position: "absolute",
      right: theme.spacing.sm,
      top: theme.spacing.sm,
      zIndex: 10,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.h1,
      lineHeight: theme.typography.lineHeight.h1,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
    },
    scrollView: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingBottom: theme.spacing.lg,
    },
    message: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      textAlign: "center",
    },
    footer: {
      marginTop: theme.spacing.md,
    },
    actionsRow: {
      marginTop: theme.spacing.sm,
    },
    actionsColumn: {
      marginTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
  });
