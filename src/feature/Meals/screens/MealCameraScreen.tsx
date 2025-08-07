import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Text } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/src/theme/useTheme";
import { useMealContext } from "@/src/context/MealContext";
import PhotoPreview from "@/src/components/PhotoPreview";
import Loader from "../components/Loader";
import { useTranslation } from "react-i18next";
import { detectIngredientsWithVision } from "@/src/services/visionService";
import { useRoute } from "@react-navigation/native";
import { useAuthContext } from "@/src/context/AuthContext";
import { Layout } from "@/src/components/Layout";

export default function MealCameraScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { meal, setMeal, updateMeal, setLastScreen } = useMealContext();
  const { t } = useTranslation("common");
  const { user } = useAuthContext();

  const route = useRoute<any>();
  const routeId = route.params?.id as string | undefined;
  const attemptFromRoute = route.params?.attempt as number | undefined;
  const skipDetection = !!route.params?.skipDetection;

  const mealId = meal?.mealId || routeId || uuidv4();
  const attempt = attemptFromRoute ?? 1;

  useEffect(() => {
    if (user?.uid && setLastScreen) setLastScreen(user.uid, "MealCamera");
  }, [setLastScreen, user?.uid]);

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

    try {
      if (!meal) {
        setMeal({
          mealId,
          name: null,
          photoUrl: photoUri,
          ingredients: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncState: "pending",
          tags: [],
          deleted: false,
          notes: null,
          type: "other",
          timestamp: "",
          source: null,
        });
      } else {
        updateMeal({ photoUrl: photoUri, mealId });
      }

      if (skipDetection) {
        setIsLoading(false);
        navigation.replace("ReviewIngredients");
        return;
      }

      const ingredients = await detectIngredientsWithVision(photoUri);
      setIsLoading(false);

      if (!ingredients || ingredients.length === 0) {
        navigation.replace("IngredientsNotRecognized", {
          image: photoUri,
          id: mealId,
          attempt,
        });
        return;
      }

      updateMeal({ ingredients, mealId, photoUrl: photoUri });
      navigation.replace("ReviewIngredients");
    } catch (error: any) {
      setIsLoading(false);
      if (error?.name === "AbortError") {
        navigation.replace("NoInternet", { image: photoUri, id: mealId });
      } else {
        navigation.replace("IngredientsNotRecognized", {
          image: photoUri,
          id: mealId,
          attempt,
        });
      }
    }
  };

  const handleRetake = () => setPhotoUri(null);

  if (!permission)
    return (
      <Layout>
        <View style={{ flex: 1, backgroundColor: theme.background }} />
      </Layout>
    );
  if (!permission.granted) {
    return (
      <Layout>
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

  if (isLoading) {
    return (
      <Layout>
        <Loader
          text={t("camera_loader_title", "Analyzing your meal...")}
          subtext={t("camera_loader_subtext", "This may take a few seconds.")}
        />
      </Layout>
    );
  }

  if (photoUri) {
    return (
      <Layout>
        <PhotoPreview
          photoUri={photoUri}
          onRetake={handleRetake}
          onAccept={handleAccept}
          isLoading={isLoading}
        />
      </Layout>
    );
  }

  return (
    <Layout>
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: theme.background }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            onCameraReady={() => setIsCameraReady(true)}
          />
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.overlay} pointerEvents="none"></View>
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
