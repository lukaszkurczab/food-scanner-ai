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

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  children?: React.ReactNode;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
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
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
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

  const modalBackground =
    theme.card || (theme.mode === "dark" ? theme.background : theme.card);

  const handleBackdropPress = () => {
    if (!closeOnBackdropPress) return;
    onClose?.();
  };

  const actionsSideBySide =
    !fullScreen &&
    !stackActions &&
    !!primaryActionLabel &&
    !!onPrimaryAction &&
    !!secondaryActionLabel &&
    !!onSecondaryAction;

  const contentBottomPadding = contentPaddingBottom ?? theme.spacing.lg;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={fullScreen ? "slide" : "fade"}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        <View
          style={[styles.centeredView, fullScreen && styles.centeredViewFullscreen]}
          pointerEvents="box-none"
        >
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: modalBackground,
                borderColor: theme.border,
                width: fullScreen ? "95%" : "90%",
                maxHeight: fullScreen ? WINDOW_HEIGHT * 0.96 : WINDOW_HEIGHT * 0.8,
                marginTop: fullScreen ? theme.spacing.nav : 0,
              },
              fullScreen && styles.modalContainerFullScreen,
            ]}
          >
            {onClose && (
              <View style={styles.closeButton}>
                <IconButton
                  icon={<AppIcon name="close" />}
                  onPress={onClose}
                  size={28}
                  iconColor={theme.textSecondary}
                  accessibilityLabel="Close"
                />
              </View>
            )}

            {title && (
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            )}

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
                <Text style={[styles.message, { color: theme.text }]}>{message}</Text>
              ) : null}
            </ScrollView>

            {footer ? (
              <View style={styles.footer}>{footer}</View>
            ) : (primaryActionLabel && onPrimaryAction) ||
              (secondaryActionLabel && onSecondaryAction) ? (
              actionsSideBySide ? (
                <GlobalActionButtons
                  label={primaryActionLabel!}
                  onPress={onPrimaryAction!}
                  secondaryLabel={secondaryActionLabel!}
                  secondaryOnPress={onSecondaryAction!}
                  layout="row"
                  rowOrder="secondary-primary"
                  containerStyle={styles.actionsRow}
                />
              ) : (
                <GlobalActionButtons
                  label={primaryActionLabel!}
                  onPress={onPrimaryAction!}
                  secondaryLabel={secondaryActionLabel!}
                  secondaryOnPress={onSecondaryAction!}
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
      elevation: 10,
      shadowColor: theme.shadow,
      shadowOpacity: 0.16,
      shadowRadius: theme.rounded.md,
      shadowOffset: { width: 0, height: theme.spacing.xs },
      position: "relative",
      borderWidth: 1,
      borderRadius: theme.rounded.md,
      padding: theme.spacing.lg,
      maxWidth: MODAL_MAX_WIDTH,
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
      fontSize: theme.typography.size.xl,
      fontFamily: theme.typography.fontFamily.bold,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    scrollView: {
      flexGrow: 0,
    },
    scrollContent: {
      paddingBottom: theme.spacing.lg,
    },
    message: {
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.regular,
      marginBottom: theme.spacing.lg,
      textAlign: "center",
    },
    footer: {
      marginTop: theme.spacing.md,
    },
    actionsRow: {
      marginTop: theme.spacing.sm,
    },
  });
