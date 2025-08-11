import React from "react";
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

const windowHeight = Dimensions.get("window").height;

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

  const modalBg =
    theme.card || (theme.mode === "dark" ? theme.background : theme.card);

  const maxWidth = 400;

  const handleBackdropPress = () => {
    if (onClose) onClose();
  };

  const actionsSideBySide =
    !fullScreen &&
    !!primaryActionLabel &&
    !!onPrimaryAction &&
    !!secondaryActionLabel &&
    !!onSecondaryAction;

  return (
    <RNModal
      visible={visible}
      transparent
      animationType={fullScreen ? "slide" : "fade"}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={[styles.overlay, { backgroundColor: theme.overlay }]} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardAvoiding}
      >
        <View
          style={[
            styles.centeredView,
            fullScreen && {
              minHeight: windowHeight,
              justifyContent: "flex-start",
            },
          ]}
        >
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: modalBg,
                borderRadius: theme.rounded.md,
                padding: theme.spacing.lg,
                maxWidth: maxWidth,
                width: fullScreen ? "95%" : "90%",
                maxHeight: fullScreen
                  ? windowHeight * 0.96
                  : windowHeight * 0.8,
                marginTop: fullScreen ? theme.spacing.xxl : 0,
              },
              fullScreen && { flex: 1, width: "98%" },
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

            {title && (
              <Text
                style={{
                  color: theme.text,
                  fontSize: theme.typography.size.lg,
                  fontFamily: theme.typography.fontFamily.bold,
                  fontWeight: "bold",
                  textAlign: "center",
                  marginBottom: theme.spacing.md,
                }}
              >
                {title}
              </Text>
            )}

            {message && (
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: theme.typography.size.base,
                  fontFamily: theme.typography.fontFamily.regular,
                  marginBottom: theme.spacing.sm,
                  textAlign: "center",
                }}
              >
                {message}
              </Text>
            )}

            <TextInput
              value={value}
              onChangeText={onChange}
              placeholder={placeholder}
              placeholderTextColor={theme.textSecondary}
              secureTextEntry={secureTextEntry}
              style={{
                width: "100%",
                borderRadius: theme.rounded.sm,
                borderWidth: 1,
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text,
                paddingVertical: 10,
                paddingHorizontal: 16,
                marginBottom: theme.spacing.md,
                fontSize: theme.typography.size.base,
                fontFamily: theme.typography.fontFamily.regular,
              }}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType={secureTextEntry ? "password" : "none"}
              accessible
              accessibilityLabel={placeholder}
            />

            {!!error && (
              <Text
                style={{
                  color: theme.error.text,
                  fontSize: theme.typography.size.sm,
                  marginBottom: theme.spacing.sm,
                  textAlign: "center",
                }}
              >
                {error}
              </Text>
            )}

            {footer ? (
              <View style={{ marginTop: theme.spacing.md }}>{footer}</View>
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
                  <View
                    style={[
                      styles.actionHalf,
                      { marginLeft: theme.spacing.sm },
                    ]}
                  >
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
                      style={{
                        marginBottom:
                          secondaryActionLabel && onSecondaryAction
                            ? theme.spacing.sm
                            : 0,
                      }}
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

const styles = StyleSheet.create({
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
  modalContainer: {
    alignSelf: "center",
    minWidth: 260,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 8,
    top: 8,
    zIndex: 10,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  actionHalf: {
    flex: 1,
  },
});

export default InputModal;
