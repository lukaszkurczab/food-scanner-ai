import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/src/theme/useTheme";
import { useMealContext } from "@/src/context/MealContext";
import PhotoPreview from "@/src/components/PhotoPreview";

type MealCameraScreenProps = {
  onPhotoTaken?: (uri: string) => void;
  frameSize?: number;
  cornerLength?: number;
  cornerThickness?: number;
  navigation: any;
};

export default function MealCameraScreen({
  frameSize = 220,
  cornerLength = 48,
  cornerThickness = 8,
  navigation,
}: MealCameraScreenProps) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { updateMeal, setLastScreen } = useMealContext();

  useEffect(() => {
    setLastScreen("MealCamera");
  }, [setLastScreen]);

  const handleTakePicture = async () => {
    if (isTakingPhoto || !isCameraReady || !cameraRef.current) return;
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) setPhotoUri(photo.uri);
    } catch (err) {
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleAccept = async () => {
    if (!photoUri) return;
    setIsLoading(true);
    const id = uuidv4();
    await updateMeal({
      photoUrl: photoUri,
      mealId: id,
      syncState: "pending",
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });
    await setLastScreen("ReviewIngredients");
    setIsLoading(false);
    navigation.navigate("ReviewIngredients", { image: photoUri, id });
  };

  const handleRetake = () => setPhotoUri(null);

  if (!permission)
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  if (!permission.granted) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      ></View>
    );
  }

  if (photoUri) {
    return (
      <PhotoPreview
        photoUri={photoUri}
        onRetake={handleRetake}
        onAccept={handleAccept}
        isLoading={isLoading}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
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
    borderColor: "white",
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 4,
    backgroundColor: "transparent",
  },
});
