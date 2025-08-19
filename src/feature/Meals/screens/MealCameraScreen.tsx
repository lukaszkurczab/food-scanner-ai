import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Text, BackHandler } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import Loader from "@feature/Meals/components/Loader";
import { useTranslation } from "react-i18next";
import { detectIngredientsWithVision } from "@/services/visionService";
import { useRoute } from "@react-navigation/native";
import { useAuthContext } from "@/context/AuthContext";
import { Layout, PhotoPreview } from "@/components";

export default function MealCameraScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { meal, setMeal, updateMeal, setLastScreen } = useMealDraftContext();
  const { t } = useTranslation("common");
  const { uid } = useAuthContext();

  const route = useRoute<any>();
  const routeId = route.params?.id as string | undefined;
  const skipDetection = !!route.params?.skipDetection;

  const mealId = meal?.mealId || routeId || uuidv4();

  const canLeaveRef = useRef(false);

  useEffect(() => {
    if (uid && setLastScreen) setLastScreen(uid, "MealCamera");
  }, [setLastScreen, uid]);

  useEffect(() => {
    const onBackPress = () => {
      if (photoUri) {
        setPhotoUri(null);
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [photoUri]);

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      if (canLeaveRef.current) return;
      if (!photoUri) return;
      e.preventDefault();
      setPhotoUri(null);
    });
    return unsub;
  }, [navigation, photoUri]);

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

  const handleAccept = async (optimizedUri?: string) => {
    const finalUri = optimizedUri || photoUri;
    if (!finalUri) return;
    setIsLoading(true);

    try {
      if (!meal) {
        setMeal({
          mealId,
          userUid: uid || "",
          name: null,
          photoUrl: finalUri,
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
          cloudId: undefined,
        } as any);
      } else {
        updateMeal({ photoUrl: finalUri, mealId });
      }

      if (!skipDetection) {
        const ingredients = uid
          ? await detectIngredientsWithVision(uid, finalUri)
          : null;
        if (ingredients && ingredients.length > 0) {
          updateMeal({ ingredients, mealId, photoUrl: finalUri });
        } else {
          setIsLoading(false);
          canLeaveRef.current = true;
          navigation.replace("IngredientsNotRecognized", {
            image: finalUri,
            id: mealId,
          });
          return;
        }
      }
    } catch {
      setIsLoading(false);
      canLeaveRef.current = true;
      navigation.replace("IngredientsNotRecognized", {
        image: finalUri,
        id: mealId,
      });
      return;
    }

    setIsLoading(false);
    canLeaveRef.current = true;
    navigation.replace("ReviewIngredients");
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
              style={{ fontWeight: "bold", fontSize: 16, color: theme.text }}
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
          secondaryText={t("camera_retake")}
          primaryText={t("camera_use_photo")}
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
            <View style={styles.overlay} pointerEvents="none" />
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
