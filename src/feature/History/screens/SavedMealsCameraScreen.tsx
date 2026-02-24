import { useMemo, useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Text, BackHandler } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useAuthContext } from "@/context/AuthContext";
import { Layout, PhotoPreview } from "@/components";
import { getSampleMealUri } from "@/utils/devSamples";
import { debugScope } from "@/utils/debug";
import type { Meal } from "@/types/meal";
import { useMeals } from "@hooks/useMeals";
import type { RootStackParamList } from "@/navigation/navigate";

const log = debugScope("Screen:SavedMealsCamera");

type SavedMealsCameraNavigation = StackNavigationProp<
  RootStackParamList,
  "SavedMealsCamera"
>;
type SavedMealsCameraRoute = RouteProp<RootStackParamList, "SavedMealsCamera">;

export default function SavedMealsCameraScreen({
  navigation,
}: {
  navigation: SavedMealsCameraNavigation;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const { t } = useTranslation("common");
  const { uid } = useAuthContext();
  const route = useRoute<SavedMealsCameraRoute>();
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
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (canLeaveRef.current) return;
      if (photoUri) {
        e.preventDefault();
        setPhotoUri(null);
        return;
      }
      if (!mealFromRoute) return;
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
      } catch {
        // Ignore sample loading errors and fallback to real camera.
      }
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
      mealId,
      photoUrl: finalUri,
      updatedAt: new Date().toISOString(),
    };
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
        <View style={styles.flexBackground} />
      </Layout>
    );
  }

  if (!permission.granted) {
    return (
      <Layout>
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionText}>
            {t("camera_permission_message")}
          </Text>
          <Pressable
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            <Text style={styles.permissionButtonLabel}>
              {t("continue")}
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
      <View style={styles.fill}>
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
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
                  style={styles.devBtn}
                >
                  <Text style={styles.devBtnText}>
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

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    fill: { flex: 1 },
    flexBackground: { flex: 1, backgroundColor: theme.background },
    permissionWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.lg,
      backgroundColor: theme.background,
    },
    permissionText: {
      fontSize: theme.typography.size.md,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
      color: theme.text,
    },
    permissionButton: {
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg + theme.spacing.xs,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.card,
    },
    permissionButtonLabel: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.base,
      color: theme.text,
    },
    cameraWrap: { flex: 1, backgroundColor: theme.background },
    camera: { flex: 1 },
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
      top: theme.spacing.md,
      left: theme.spacing.md,
      right: theme.spacing.md,
      flexDirection: "row",
      gap: theme.spacing.sm,
      justifyContent: "flex-start",
    },
    devBtn: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    devBtnText: {
      color: theme.text,
      fontSize: theme.typography.size.sm,
    },
  });
