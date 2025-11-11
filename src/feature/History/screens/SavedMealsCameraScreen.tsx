import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Text, BackHandler } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useRoute } from "@react-navigation/native";
import { useAuthContext } from "@/context/AuthContext";
import { Layout, PhotoPreview } from "@/components";
import { getSampleMealUri } from "@/utils/devSamples";
import { debugScope } from "@/utils/debug";
import type { Meal } from "@/types/meal";
import { useMeals } from "@hooks/useMeals";

const log = debugScope("Screen:SavedMealsCamera");

export default function SavedMealsCameraScreen({
  navigation,
}: {
  navigation: any;
}) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const { t } = useTranslation("common");
  const { uid } = useAuthContext();
  const route = useRoute<any>();
  const mealFromRoute: Meal | undefined = route.params?.meal;
  const mealId = route.params?.id || mealFromRoute?.mealId || uuidv4();
  const canLeaveRef = useRef(false);
  const { updateMeal } = useMeals(uid || "");

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
      if (photoUri) {
        e.preventDefault();
        setPhotoUri(null);
        return;
      }
      e.preventDefault();
      navigation.replace("MealDetails", { meal: mealFromRoute, edit: true });
    });
    return unsub;
  }, [navigation, photoUri, mealFromRoute]);

  const handleTakePicture = async () => {
    log.log("takePicture start", { isCameraReady });
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      try {
        const uri = await getSampleMealUri();
        setPhotoUri(uri);
        return;
      } catch {}
    }
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
    if (!finalUri || !mealFromRoute) return;
    const updated: Meal = {
      ...mealFromRoute,
      mealId: mealId,
      photoUrl: finalUri,
      updatedAt: new Date().toISOString(),
    } as Meal;
    await updateMeal(updated);
    canLeaveRef.current = true;
    navigation.replace("MealDetails", {
      meal: updated,
      edit: true,
      baseline: mealFromRoute,
    });
  };

  const handleRetake = () => setPhotoUri(null);

  if (!permission) {
    return (
      <Layout>
        <View style={{ flex: 1, backgroundColor: theme.background }} />
      </Layout>
    );
  }

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

  if (photoUri) {
    return (
      <Layout>
        <PhotoPreview
          photoUri={photoUri}
          onRetake={handleRetake}
          onAccept={handleAccept}
          isLoading={false}
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
            {typeof __DEV__ !== "undefined" && __DEV__ && (
              <View style={styles.devRow}>
                <Pressable
                  onPress={async () => {
                    const uri = await getSampleMealUri();
                    setPhotoUri(uri);
                  }}
                  style={[
                    styles.devBtn,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={{ color: theme.text }}>
                    {t("dev.sample_meal", { ns: "meals" })}
                  </Text>
                </Pressable>
              </View>
            )}
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
  devRow: {
    position: "absolute",
    top: 24,
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-start",
  },
  devBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
});
