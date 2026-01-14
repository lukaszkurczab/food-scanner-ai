import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable, Text, Linking } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { useUserContext } from "@contexts/UserContext";
import { Layout, PhotoPreview } from "@/components";
import { MaterialIcons } from "@expo/vector-icons";

const SHUTTER = 72;
const SWITCH = 50;
const GAP = 24;

type AvatarCameraScreenProps = {
  onPhotoTaken?: (uri: string) => void;
  navigation: any;
};

export default function AvatarCameraScreen({
  onPhotoTaken,
  navigation,
}: AvatarCameraScreenProps) {
  const { t } = useTranslation(["common", "profile"]);
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { setAvatar } = useUserContext();
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");

  const handleTakePicture = async () => {
    if (isTakingPhoto || !isCameraReady || !cameraRef.current) return;
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        onPhotoTaken?.(photo.uri);
      }
    } catch (err) {
      console.error("Error taking picture:", err);
    } finally {
      setIsTakingPhoto(false);
    }
  };

  if (!permission) {
    return (
      <Layout>
        <View style={{ flex: 1, backgroundColor: theme.background }} />
      </Layout>
    );
  }

  if (!permission.granted) {
    const blocked = permission.canAskAgain === false;
    return (
      <Layout>
        <View style={styles.permissionContainer}>
          <Text style={[styles.permissionTitle, { color: theme.text }]}>
            {t("common:camera_permission_title", {
              defaultValue: "Camera requires permission",
            })}
          </Text>

          <Text style={[styles.permissionText, { color: theme.text }]}>
            {blocked
              ? t("profile:camera_permission_blocked_message", {
                  defaultValue:
                    "Camera access is currently disabled. You can enable it in system Settings.",
                })
              : t("common:camera_permission_message", {
                  defaultValue:
                    "CaloriAI uses the camera to scan meals and barcodes and to take profile photos.",
                })}
          </Text>

          <Pressable
            onPress={blocked ? () => Linking.openSettings() : requestPermission}
            style={[styles.permissionButton, { backgroundColor: theme.card }]}
          >
            <Text style={[styles.permissionButtonText, { color: theme.text }]}>
              {t("common:continue", { defaultValue: "Continue" })}
            </Text>
          </Pressable>
        </View>
      </Layout>
    );
  }

  if (photoUri) {
    return (
      <PhotoPreview
        photoUri={photoUri}
        onRetake={() => {
          if (!isUploading) setPhotoUri(null);
        }}
        onAccept={async () => {
          setIsUploading(true);
          try {
            await setAvatar(photoUri);
            navigation.navigate("Profile");
          } catch (err) {
            console.log(err);
          } finally {
            setIsUploading(false);
          }
        }}
        isLoading={isUploading}
        primaryText={t("profile:avatarPreview_title")}
        secondaryText={t("profile:avatarPreview_subtitle")}
      />
    );
  }

  return (
    <Layout>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing={facing}
          onCameraReady={() => setIsCameraReady(true)}
        />
        <View style={StyleSheet.absoluteFill}>
          <View style={styles.controlsWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.shutterButton,
                {
                  opacity: pressed ? 0.7 : 1,
                  left: "50%",
                  transform: [{ translateX: -SHUTTER / 2 }],
                },
              ]}
              onPress={handleTakePicture}
              disabled={isTakingPhoto}
            />
            <Pressable
              style={({ pressed }) => [
                styles.switchButton,
                {
                  opacity: pressed ? 0.7 : 1,
                  left: "50%",
                  transform: [{ translateX: SHUTTER / 2 + GAP }],
                },
              ]}
              onPress={() =>
                setFacing((f) => (f === "back" ? "front" : "back"))
              }
              accessibilityLabel={t("common:switch_camera") || "Switch camera"}
            >
              <MaterialIcons name="flip-camera-ios" size={26} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionTitle: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 12,
    fontWeight: "700",
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    opacity: 0.9,
  },
  permissionButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 32,
  },
  permissionButtonText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  controlsWrapper: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    height: SHUTTER,
    justifyContent: "center",
  },
  shutterButton: {
    position: "absolute",
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 4,
    borderColor: "white",
    backgroundColor: "transparent",
  },
  switchButton: {
    position: "absolute",
    width: SWITCH,
    height: SWITCH,
    borderRadius: SWITCH / 2,
    borderWidth: 2,
    borderColor: "white",
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
});
