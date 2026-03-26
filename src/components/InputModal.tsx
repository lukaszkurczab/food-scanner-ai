import React, { useMemo } from "react";
import {
  Modal as RNModal,
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { IconButton } from "@/components/IconButton";
import AppIcon from "@/components/AppIcon";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";
import { TextInput as AppTextInput } from "@/components/TextInput";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const MODAL_MAX_WIDTH = 400;
type InputModalActionTone = "primary" | "secondary" | "ghost" | "destructive";

type InputModalAction = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  tone?: InputModalActionTone;
};

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  primaryAction?: InputModalAction;
  secondaryAction?: InputModalAction;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  onClose?: () => void;
  fullScreen?: boolean;
  footer?: React.ReactNode;
  error?: string;
};

export const InputModal: React.FC<Props> = ({
  visible,
  title,
  message,
  value,
  onChange,
  placeholder,
  secureTextEntry = false,
  primaryAction,
  secondaryAction,
  primaryActionLabel,
  secondaryActionLabel,
  onPrimaryAction,
  onSecondaryAction,
  onClose,
  fullScreen = false,
  footer,
  error,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const modalSizeStyle = useMemo(
    () =>
      fullScreen
        ? styles.modalContainerFullScreenSize
        : styles.modalContainerDefaultSize,
    [fullScreen, styles],
  );
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

  const actionsSideBySide =
    !fullScreen && !!resolvedPrimaryAction && !!resolvedSecondaryAction;

  const handleBackdropPress = () => {
    onClose?.();
  };

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
        >
          <TouchableWithoutFeedback onPress={handleBackdropPress}>
            <View style={styles.overlay} />
          </TouchableWithoutFeedback>

          <View
            style={[
              styles.modalContainer,
              modalSizeStyle,
              fullScreen && styles.modalContainerFullScreen,
            ]}
          >
            {onClose ? (
              <View style={styles.closeButton}>
                <IconButton
                  icon={<AppIcon name="close" />}
                  onPress={onClose}
                  size={32}
                  iconColor={theme.textSecondary}
                  accessibilityLabel="Close"
                />
              </View>
            ) : null}

            {title ? <Text style={styles.title}>{title}</Text> : null}

            {message ? <Text style={styles.message}>{message}</Text> : null}

            <AppTextInput
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              secureTextEntry={secureTextEntry}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={secureTextEntry ? "password" : "none"}
              accessibilityLabel={placeholder}
              error={error}
            />

            {footer ? (
              <View style={styles.footer}>{footer}</View>
            ) : resolvedPrimaryAction || resolvedSecondaryAction ? (
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
                layout={actionsSideBySide ? "row" : "column"}
                rowOrder="secondary-primary"
                containerStyle={
                  actionsSideBySide ? styles.actionsRow : styles.actionsColumn
                }
              />
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
      backgroundColor: theme.overlay,
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
      backgroundColor: theme.surfaceElevated,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.28 : 0.12,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 8 },
      position: "relative",
      borderRadius: theme.rounded.lg,
      borderWidth: 1,
      borderColor: theme.border,
      padding: theme.spacing.lg,
      maxWidth: MODAL_MAX_WIDTH,
    },
    modalContainerDefaultSize: {
      width: "90%",
      maxHeight: WINDOW_HEIGHT * 0.8,
    },
    modalContainerFullScreenSize: {
      width: "95%",
      maxHeight: WINDOW_HEIGHT * 0.96,
      marginTop: theme.spacing.nav,
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
      fontSize: theme.typography.size.h2,
      lineHeight: theme.typography.lineHeight.h2,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
      marginBottom: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
    },
    message: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      marginBottom: theme.spacing.sm,
      textAlign: "center",
    },
    input: {
      marginBottom: theme.spacing.md,
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

export default InputModal;
