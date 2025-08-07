import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import PhotoPreview from "@/src/components/PhotoPreview";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";
import { useUserContext } from "@/src/context/UserContext";
import { Layout } from "@/src/components/Layout";

type AvatarCameraScreenProps = {
  onPhotoTaken?: (uri: string) => void;
  frameSize?: number;
  cornerLength?: number;
  cornerThickness?: number;
  navigation: any;
};

export default function AvatarCameraScreen({
  onPhotoTaken,
  frameSize = 220,
  cornerLength = 48,
  cornerThickness = 8,
  navigation,
}: AvatarCameraScreenProps) {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const { setAvatar } = useUserContext();

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const lastTap = useRef<number>(0);

  const handleTakePicture = async () => {
    if (isTakingPhoto || !isCameraReady || !cameraRef.current) return;
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
        if (onPhotoTaken) onPhotoTaken(photo.uri);
      }
    } catch (err) {
      console.error("Error taking picture:", err);
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleScreenPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      setFacing((f) => (f === "back" ? "front" : "back"));
    }
    lastTap.current = now;
  };

  if (!permission)
    return (
      <Layout hiddenLayout={true}>
        <View style={{ flex: 1, backgroundColor: theme.background }} />
      </Layout>
    );
  if (!permission.granted) {
    return (
      <Layout hiddenLayout={true}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: theme.background,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              textAlign: "center",
              marginBottom: 20,
              color: theme.text,
            }}
          >
            {t("camera_permission_message")}
          </Text>
          <Pressable
            onPress={requestPermission}
            style={{
              paddingVertical: 12,
              paddingHorizontal: 32,
              borderRadius: 32,
              backgroundColor: theme.card,
            }}
          >
            <Text
              style={{
                fontWeight: "bold",
                fontSize: 16,
                color: theme.text,
              }}
            >
              {t("camera_grant_access")}
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
          } finally {
            setIsUploading(false);
          }
        }}
        isLoading={isUploading}
      />
    );
  }

  return (
    <Layout hiddenLayout={true}>
      <Pressable style={{ flex: 1 }} onPress={handleScreenPress}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
            onCameraReady={() => setIsCameraReady(true)}
          />
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.overlay} pointerEvents="none">
              <View
                style={[
                  styles.corner,
                  {
                    borderLeftWidth: cornerThickness,
                    borderTopWidth: cornerThickness,
                    borderColor: theme.textSecondary,
                    top: `50%`,
                    left: `50%`,
                    marginLeft: -frameSize / 2,
                    marginTop: -frameSize / 2,
                    width: cornerLength,
                    height: cornerLength,
                    borderTopLeftRadius: 18,
                  },
                ]}
              />
              <View
                style={[
                  styles.corner,
                  {
                    borderRightWidth: cornerThickness,
                    borderTopWidth: cornerThickness,
                    borderColor: theme.textSecondary,
                    top: `50%`,
                    left: `50%`,
                    marginLeft: frameSize / 2 - cornerLength,
                    marginTop: -frameSize / 2,
                    width: cornerLength,
                    height: cornerLength,
                    borderTopRightRadius: 18,
                  },
                ]}
              />
              <View
                style={[
                  styles.corner,
                  {
                    borderLeftWidth: cornerThickness,
                    borderBottomWidth: cornerThickness,
                    borderColor: theme.textSecondary,
                    top: `50%`,
                    left: `50%`,
                    marginLeft: -frameSize / 2,
                    marginTop: frameSize / 2 - cornerLength,
                    width: cornerLength,
                    height: cornerLength,
                    borderBottomLeftRadius: 18,
                  },
                ]}
              />
              <View
                style={[
                  styles.corner,
                  {
                    borderRightWidth: cornerThickness,
                    borderBottomWidth: cornerThickness,
                    borderColor: theme.textSecondary,
                    top: `50%`,
                    left: `50%`,
                    marginLeft: frameSize / 2 - cornerLength,
                    marginTop: frameSize / 2 - cornerLength,
                    width: cornerLength,
                    height: cornerLength,
                    borderBottomRightRadius: 18,
                  },
                ]}
              />
            </View>
            <View style={styles.shutterWrapper}>
              <Pressable
                style={({ pressed }) => [
                  styles.shutterButton,
                  {
                    opacity: pressed ? 0.7 : 1,
                    backgroundColor: "transparent",
                  },
                ]}
                onPress={handleTakePicture}
                disabled={isTakingPhoto}
              />
            </View>
          </View>
        </View>
      </Pressable>
    </Layout>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  corner: {
    position: "absolute",
    backgroundColor: "transparent",
  },
  shutterWrapper: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  shutterButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    backgroundColor: "transparent",
    borderColor: "white",
  },
});
