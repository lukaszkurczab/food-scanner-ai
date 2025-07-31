import React, { useRef, useState } from "react";
import { View, StyleSheet, Pressable, Image, Text } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/theme/useTheme";

type CameraScreenProps = {
  onPhotoTaken?: (uri: string) => void;
  frameSize?: number;
  cornerLength?: number;
  cornerThickness?: number;
};

export default function CameraScreen({
  onPhotoTaken,
  frameSize = 220,
  cornerLength = 48,
  cornerThickness = 8,
}: CameraScreenProps) {
  const { t } = useTranslation("common");
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

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

  if (!permission)
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  if (!permission.granted) {
    return (
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
    );
  }

  if (photoUri) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <Image
          source={{ uri: photoUri }}
          style={{ flex: 1 }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <CameraView
        ref={cameraRef}
        style={{ flex: 1 }}
        facing="back"
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
                borderColor: theme.text,
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
  },
});
