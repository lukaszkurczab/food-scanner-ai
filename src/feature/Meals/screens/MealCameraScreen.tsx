import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Alert } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/src/theme/useTheme";
import { useMealContext } from "@/src/context/MealContext";
import PhotoPreview from "@/src/components/PhotoPreview";
import Loader from "../components/Loader";
import { useTranslation } from "react-i18next";
import { detectIngredientsWithVision } from "@/src/services/visionService";

type MealCameraScreenProps = {
  navigation: any;
  frameSize?: number;
  cornerLength?: number;
  cornerThickness?: number;
};

export default function MealCameraScreen({
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
  const { t } = useTranslation("meals");

  useEffect(() => {
    setLastScreen("MealCamera");
  }, [setLastScreen]);

  const handleTakePicture = async () => {
    if (isTakingPhoto || !isCameraReady || !cameraRef.current) return;
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) setPhotoUri(photo.uri);
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleAccept = async () => {
    if (!photoUri) return;
    setIsLoading(true);
    const id = uuidv4();

    try {
      await updateMeal({
        photoUrl: photoUri,
        mealId: id,
        syncState: "pending",
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      await setLastScreen("ReviewIngredients");

      const ingredients = await detectIngredientsWithVision(photoUri);

      setIsLoading(false);

      if (!ingredients) {
        navigation.replace("IngredientsNotRecognized", { image: photoUri, id });
        return;
      }
      if (ingredients.length === 0) {
        navigation.replace("IngredientsNotRecognized", { image: photoUri, id });
        return;
      }
      navigation.replace("ReviewIngredients", {
        image: photoUri,
        id,
        ingredients,
      });
    } catch (error: any) {
      setIsLoading(false);
      if (error?.name === "AbortError") {
        navigation.replace("NoInternet", { image: photoUri, id });
      } else {
        navigation.replace("IngredientsNotRecognized", { image: photoUri, id });
      }
    }
  };

  const handleRetake = () => setPhotoUri(null);

  if (!permission)
    return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  if (!permission.granted) {
    return (
      <View
        style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
      />
    );
  }

  if (isLoading) {
    return (
      <Loader
        text={t("camera_loader_title", "Analyzing your meal...")}
        subtext={t("camera_loader_subtext", "This may take a few seconds.")}
      />
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
            {/* Róg kadru */}
            {/* ... (Twój kod z rogami) */}
          </View>
          <View style={styles.shutterWrapper}>
            <Pressable
              style={({ pressed }) => [
                styles.shutterButton,
                { opacity: pressed ? 0.7 : 1 },
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
  corner: { position: "absolute", backgroundColor: "transparent" },
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
