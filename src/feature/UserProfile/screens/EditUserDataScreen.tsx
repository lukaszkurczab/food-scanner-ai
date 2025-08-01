import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Modal } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import { Layout } from "@/src/components";
import ListItem from "../components/ListItem";
import { MaterialIcons } from "@expo/vector-icons";

export default function ChangeUserDataScreen({ navigation }: any) {
  const { t } = useTranslation("profile");
  const theme = useTheme();
  const [photoModal, setPhotoModal] = useState(false);

  return (
    <Layout showNavigation={false}>
      <View style={{ justifyContent: "flex-start", height: "100%" }}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <MaterialIcons name="chevron-left" size={28} color={theme.text} />
          </Pressable>
          <Text
            style={[styles.heading, { color: theme.text }]}
            accessibilityRole="header"
          >
            {t("changeUserData")}
          </Text>
        </View>

        <View style={styles.list}>
          <ListItem
            label={t("changeUserPhoto")}
            onPress={() => setPhotoModal(true)}
          />
          <ListItem
            label={t("changeUsername")}
            onPress={() => navigation.navigate("ChangeUsername")}
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
              onPress={() => {
                setPhotoModal(false);
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
});
