import React, { useState } from "react";
import { View, Text, StyleSheet, Image, Pressable, Alert } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Layout, LongTextInput } from "@/components";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "@/components/PrimaryButton";
import NetInfo from "@react-native-community/netinfo";
import * as Device from "expo-device";
import { sendFeedback } from "@/services/feedbackService";
import { useAuthContext } from "@/context/AuthContext";

export default function SendFeedbackScreen({ navigation }: any) {
  const theme = useTheme();
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
    } catch (e) {
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
      <View style={{ flex: 1, justifyContent: "space-between" }}>
        <Pressable
          style={{
            marginBottom: 24,
            flexDirection: "row",
            alignItems: "center",
          }}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="chevron-left" size={28} color={theme.text} />
          <Text
            style={{
              color: theme.text,
              fontSize: 24,
              fontFamily: theme.typography.fontFamily.bold,
              marginLeft: 6,
            }}
          >
            {t("sendFeedback", { defaultValue: "Send us your feedback" })}
          </Text>
        </Pressable>

        <View style={{ flexGrow: 1, justifyContent: "center" }}>
          {!sent ? (
            <>
              <Text style={[styles.info, { color: theme.textSecondary }]}>
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
                inputStyle={{ minHeight: 200, textAlignVertical: "top" }}
                maxLength={500}
              />

              <Pressable
                onPress={handlePickAttachment}
                style={{ marginTop: 10, marginBottom: 2 }}
              >
                <Text
                  style={{
                    color: theme.accentSecondary,
                    fontSize: 16,
                    fontFamily: theme.typography.fontFamily.bold,
                  }}
                >
                  {t("addAttachment", { defaultValue: "Add attachment" })}
                </Text>
              </Pressable>
              <Text
                style={{
                  color: theme.textSecondary,
                  fontSize: 13,
                  marginBottom: 8,
                }}
              >
                {t("addAttachmentDescription", {
                  defaultValue:
                    "Optional: attach a screenshot to help us understand the issue",
                })}
              </Text>
              {attachment && (
                <View style={{ alignItems: "flex-start", marginBottom: 8 }}>
                  <Image
                    source={{ uri: attachment }}
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 14,
                      marginTop: 4,
                      marginBottom: 2,
                    }}
                  />
                  <Pressable onPress={() => setAttachment(null)} hitSlop={10}>
                    <Text style={{ color: theme.error.text, fontSize: 13 }}>
                      {t("removeAttachment", { defaultValue: "Remove" })}
                    </Text>
                  </Pressable>
                </View>
              )}

              <Text style={{ color: theme.text, marginTop: 8, fontSize: 14 }}>
                {t("feedbackAppInfo", {
                  defaultValue:
                    "Your app version and device info will be sent automatically to help us improve CaloriAI.",
                })}
              </Text>

              <PrimaryButton
                label={t("send", { defaultValue: "Send" })}
                style={{ marginTop: 36, minHeight: 58 }}
                loading={sending}
                disabled={!message || sending}
                onPress={handleSend}
                textStyle={{ fontSize: 20 }}
              />
            </>
          ) : (
            <View style={{ alignItems: "center", marginTop: 42 }}>
              <Text
                style={{
                  color: theme.text,
                  fontSize: 24,
                  fontFamily: theme.typography.fontFamily.bold,
                  textAlign: "center",
                }}
              >
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

const styles = StyleSheet.create({
  info: {
    marginBottom: 36,
    fontSize: 16,
    lineHeight: 22,
  },
  textarea: {
    marginBottom: 24,
    backgroundColor: "transparent",
  },
});
