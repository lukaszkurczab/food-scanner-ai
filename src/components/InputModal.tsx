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
  TextInput,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { IconButton } from "@/components/IconButton";
import { MaterialIcons } from "@expo/vector-icons";

const WINDOW_HEIGHT = Dimensions.get("window").height;
const MODAL_MAX_WIDTH = 400;
const INPUT_VERTICAL_PADDING = 10;

type Props = {
  visible: boolean;
  title?: string;
  message?: string;
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  secondaryActionLabel?: string;
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
  primaryActionLabel,
  onPrimaryAction,
  secondaryActionLabel,
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
    [fullScreen, styles]
  );

  const actionsSideBySide =
    !fullScreen &&
    !!primaryActionLabel &&
    !!onPrimaryAction &&
    !!secondaryActionLabel &&
    !!onSecondaryAction;

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
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.overlay} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        <View
          style={[styles.centeredView, fullScreen && styles.centeredViewFullscreen]}
        >
          <View
            style={[
              styles.modalContainer,
              modalSizeStyle,
              fullScreen && styles.modalContainerFullScreen,
            ]}
          >
            {onClose && (
              <View style={styles.closeButton}>
                <IconButton
                  icon={<MaterialIcons name="close" />}
                  onPress={onClose}
                  size={28}
                  iconColor={theme.textSecondary}
                />
              </View>
            )}

            {title && <Text style={styles.title}>{title}</Text>}

            {message && <Text style={styles.message}>{message}</Text>}

            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              secureTextEntry={secureTextEntry}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={secureTextEntry ? "password" : "none"}
              accessible
              accessibilityLabel={placeholder}
            />

            {!!error && <Text style={styles.errorText}>{error}</Text>}

            {footer ? (
              <View style={styles.footer}>{footer}</View>
            ) : (primaryActionLabel && onPrimaryAction) ||
              (secondaryActionLabel && onSecondaryAction) ? (
              actionsSideBySide ? (
                <View style={styles.actionsRow}>
                  <View style={styles.actionHalf}>
                    <SecondaryButton
                      label={secondaryActionLabel!}
                      onPress={onSecondaryAction!}
                    />
                  </View>
                  <View style={[styles.actionHalf, styles.actionHalfSpaced]}>
                    <PrimaryButton
                      label={primaryActionLabel!}
                      onPress={onPrimaryAction!}
                    />
                  </View>
                </View>
              ) : (
                <View>
                  {primaryActionLabel && onPrimaryAction && (
                    <PrimaryButton
                      label={primaryActionLabel}
                      onPress={onPrimaryAction}
                      style={
                        secondaryActionLabel && onSecondaryAction
                          ? styles.primaryStackedSpacing
                          : undefined
                      }
                    />
                  )}
                  {secondaryActionLabel && onSecondaryAction && (
                    <SecondaryButton
                      label={secondaryActionLabel}
                      onPress={onSecondaryAction}
                    />
                  )}
                </View>
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
      backgroundColor: theme.card,
      shadowColor: theme.shadow,
      shadowOpacity: 0.16,
      shadowRadius: theme.rounded.md,
      shadowOffset: { width: 0, height: theme.spacing.xs },
      position: "relative",
      borderRadius: theme.rounded.md,
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
      marginTop: theme.spacing.xxl,
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
      fontSize: theme.typography.size.lg,
      fontFamily: theme.typography.fontFamily.bold,
      fontWeight: "bold",
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    message: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.regular,
      marginBottom: theme.spacing.sm,
      textAlign: "center",
    },
    input: {
      width: "100%",
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.background,
      color: theme.text,
      paddingVertical: INPUT_VERTICAL_PADDING,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.regular,
    },
    errorText: {
      color: theme.error.text,
      fontSize: theme.typography.size.sm,
      marginBottom: theme.spacing.sm,
      textAlign: "center",
    },
    footer: {
      marginTop: theme.spacing.md,
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: theme.spacing.sm,
    },
    actionHalf: {
      flex: 1,
    },
    actionHalfSpaced: {
      marginLeft: theme.spacing.sm,
    },
    primaryStackedSpacing: {
      marginBottom: theme.spacing.sm,
    },
  });

export default InputModal;
