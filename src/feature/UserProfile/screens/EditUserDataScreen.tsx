import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import { Layout } from "@/src/components";
import ListItem from "../components/ListItem";
import { MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useUserContext } from "@/src/context/UserContext";

export default function ChangeUserDataScreen({ navigation }: any) {
  const { t } = useTranslation("profile");
  const theme = useTheme();
  const [photoModal, setPhotoModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { setAvatar } = useUserContext();

  return (
    <Layout showNavigation={false}>
      <View style={{ justifyContent: "flex-start", height: "100%" }}>
        <Pressable style={styles.header} onPress={() => navigation.goBack()}>
          <MaterialIcons name="chevron-left" size={28} color={theme.text} />

          <Text
            style={[styles.heading, { color: theme.text }]}
            accessibilityRole="header"
          >
            {t("changeUserData")}
          </Text>
        </Pressable>

        <View style={styles.list}>
          <ListItem
            label={t("changeUserPhoto")}
            onPress={() => setPhotoModal(true)}
          />
          <ListItem
            label={t("changeUsername")}
            onPress={() => navigation.navigate("UsernameChange")}
          />
          <ListItem
            label={t("changeEmail")}
            onPress={() => navigation.navigate("ChangeEmail")}
          />
          <ListItem
            label={t("changePassword")}
            onPress={() => navigation.navigate("ChangePassword")}
          />
        </View>
        {isUploading && (
          <View style={styles.uploadOverlay}>
            <ActivityIndicator size="large" color={theme.accentSecondary} />
          </View>
        )}
      </View>

      <Modal visible={photoModal} transparent>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setPhotoModal(false)}
        >
          <Pressable
            style={[styles.modal, { backgroundColor: theme.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Pressable
              style={[
                styles.modalButton,
                { borderBottomWidth: 1, borderBottomColor: theme.border },
              ]}
              onPress={() => {
                setPhotoModal(false);
                navigation.navigate("AvatarCamera");
              }}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>
                {t("makePhoto")}
              </Text>
            </Pressable>
            <Pressable
              style={styles.modalButton}
              disabled={isUploading}
              onPress={async () => {
                setPhotoModal(false);
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ImagePicker.MediaTypeOptions.Images,
                  allowsEditing: true,
                  quality: 0.7,
                });
                if (
                  !result.canceled &&
                  result.assets &&
                  result.assets[0]?.uri
                ) {
                  setIsUploading(true);
                  try {
                    await setAvatar(result.assets[0].uri);
                  } catch (e) {}
                  setIsUploading(false);
                }
              }}
            >
              <Text style={[styles.modalButtonText, { color: theme.text }]}>
                {t("addFromGallery")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Layout>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 24,
    gap: 16,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
  },
  list: {
    marginVertical: 12,
    borderRadius: 24,
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  modal: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 0,
    margin: 0,
    paddingBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  modalButton: {
    paddingVertical: 18,
    alignItems: "center",
    width: "100%",
  },
  modalButtonText: {
    fontSize: 18,
    fontWeight: "600",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99,
  },
});
