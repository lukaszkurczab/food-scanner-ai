import { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Alert,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { BackTitleHeader, Layout, LongTextInput } from "@/components";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/PrimaryButton";
import NetInfo from "@react-native-community/netinfo";
import * as Device from "expo-device";
import { sendFeedback } from "@/services/feedback/feedbackService";
import { useAuthContext } from "@/context/AuthContext";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

type SendFeedbackNavigation = StackNavigationProp<
  RootStackParamList,
  "SendFeedback"
>;

type SendFeedbackScreenProps = {
  navigation: SendFeedbackNavigation;
};

export default function SendFeedbackScreen({
  navigation,
}: SendFeedbackScreenProps) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("profile");
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { firebaseUser: user } = useAuthContext();

  const handlePickAttachment = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets[0]?.uri) {
      setAttachment(result.assets[0].uri);
    }
  };

  const handleSend = async () => {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      Alert.alert(
        t("noInternet", { defaultValue: "No internet connection" }),
        t("checkConnection", {
          defaultValue: "Please check your connection and try again.",
        })
      );
      return;
    }
    setSending(true);
    try {
      await sendFeedback({
        message,
        attachmentUri: attachment,
        userUid: user?.uid ?? null,
        email: user?.email ?? null,
        deviceInfo: {
          modelName: Device.modelName,
          osName: Device.osName,
          osVersion: Device.osVersion,
        },
      });
      setSent(true);
      setMessage("");
      setAttachment(null);
    } catch {
      Alert.alert(
        t("error", { defaultValue: "Error" }),
        t("feedbackSendError", {
          defaultValue: "Failed to send feedback. Try again later.",
        })
      );
    }
    setSending(false);
  };

  return (
    <Layout>
      <View style={styles.container}>
        <BackTitleHeader
          title={t("sendFeedback", { defaultValue: "Send us your feedback" })}
          onBack={() => navigation.goBack()}
        />

        <View style={styles.content}>
          {!sent ? (
            <>
              <Text style={styles.info}>
                {t("feedbackDescription", {
                  defaultValue:
                    "Share your thoughts, suggestions, or issues. We appreciate every message!",
                })}
              </Text>

              <LongTextInput
                placeholder={t("feedbackPlaceholder", {
                  defaultValue: "Type your message here...",
                })}
                value={message}
                onChangeText={setMessage}
                style={styles.textarea}
                inputStyle={styles.textareaInput}
                maxLength={500}
              />

              <Pressable onPress={handlePickAttachment} style={styles.addButton}>
                <Text style={styles.addButtonText}>
                  {t("addAttachment", { defaultValue: "Add attachment" })}
                </Text>
              </Pressable>
              <Text style={styles.addDescription}>
                {t("addAttachmentDescription", {
                  defaultValue:
                    "Optional: attach a screenshot to help us understand the issue",
                })}
              </Text>
              {attachment && (
                <View style={styles.attachment}>
                  <Image
                    source={{ uri: attachment }}
                    style={styles.attachmentImage}
                    onError={() => setAttachment(null)}
                  />
                  <Pressable onPress={() => setAttachment(null)} hitSlop={10}>
                    <Text style={styles.removeText}>
                      {t("removeAttachment", { defaultValue: "Remove" })}
                    </Text>
                  </Pressable>
                </View>
              )}

              <Text style={styles.infoNote}>
                {t("feedbackAppInfo", {
                  defaultValue:
                    "Your app version and device info will be sent automatically to help us improve Fitaly.",
                })}
              </Text>

              <PrimaryButton
                label={t("send", { defaultValue: "Send" })}
                style={styles.sendButton}
                loading={sending}
                disabled={!message || sending}
                onPress={handleSend}
                textStyle={styles.sendButtonText}
              />
            </>
          ) : (
            <View style={styles.thankYou}>
              <Text style={styles.thankYouText}>
                {t("feedbackThankYou", {
                  defaultValue: "Thank you for your feedback!",
                })}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, justifyContent: "space-between" },
    content: { flexGrow: 1, justifyContent: "center" },
    info: {
      marginBottom: theme.spacing.xxl,
      fontSize: theme.typography.size.base,
      lineHeight: 22,
      color: theme.textSecondary,
    },
    textarea: {
      marginBottom: theme.spacing.xl,
      backgroundColor: "transparent",
    },
    textareaInput: {
      minHeight: 200,
      textAlignVertical: "top",
    },
    addButton: {
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    addButtonText: {
      color: theme.accentSecondary,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.bold,
    },
    addDescription: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      marginBottom: theme.spacing.sm,
    },
    attachment: {
      alignItems: "flex-start",
      marginBottom: theme.spacing.sm,
    },
    attachmentImage: {
      width: 80,
      height: 80,
      borderRadius: theme.rounded.md,
      marginTop: theme.spacing.xs,
      marginBottom: theme.spacing.xs,
    },
    removeText: {
      color: theme.error.text,
      fontSize: theme.typography.size.sm,
    },
    infoNote: {
      color: theme.text,
      marginTop: theme.spacing.sm,
      fontSize: theme.typography.size.sm,
    },
    sendButton: {
      marginTop: theme.spacing.xxl,
      minHeight: 58,
    },
    sendButtonText: { fontSize: theme.typography.size.lg },
    thankYou: { alignItems: "center", marginTop: theme.spacing.xxl },
    thankYouText: {
      color: theme.text,
      fontSize: theme.typography.size.xl,
      fontFamily: theme.typography.fontFamily.bold,
      textAlign: "center",
    },
  });
