import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Text, BackHandler } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { useRoute, type RouteProp } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { useAuthContext } from "@/context/AuthContext";
import { Button, Layout, PhotoPreview } from "@/components";
import { getSampleMealUri } from "@/utils/devSamples";
import { debugScope } from "@/utils/debug";
import type { Meal } from "@/types/meal";
import { useMeals } from "@hooks/useMeals";
import type { RootStackParamList } from "@/navigation/navigate";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const log = debugScope("Screen:SavedMealsCamera");

function isLocalUri(value?: string | null): value is string {
  return (
    typeof value === "string" &&
    (value.startsWith("file://") || value.startsWith("content://"))
  );
}

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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const { t } = useTranslation(["common", "meals"]);
  const { uid } = useAuthContext();
  const route = useRoute<SavedMealsCameraRoute>();
  const mealFromRoute: Meal | undefined = route.params?.meal;
  const mealId = route.params?.id || mealFromRoute?.mealId || uuidv4();
  const returnTo = route.params?.returnTo || "MealDetails";
  const canLeaveRef = useRef(false);
  const { updateMeal } = useMeals(uid || "");
  const replaceToOrigin = useCallback(
    (meal: Meal) => {
      canLeaveRef.current = true;
      if (returnTo === "EditHistoryMealDetails") {
        navigation.replace("EditHistoryMealDetails", { meal });
        return;
      }
      if (!meal.cloudId) {
        navigation.replace("HistoryList");
        return;
      }
      navigation.replace("MealDetails", {
        cloudId: meal.cloudId,
        initialMeal: meal,
      });
    },
    [navigation, returnTo],
  );
  const returnToOrigin = useMemo(
    () => () => {
      if (!mealFromRoute) return;
      replaceToOrigin(mealFromRoute);
    },
    [mealFromRoute, replaceToOrigin],
  );
  const returnLabel =
    returnTo === "EditHistoryMealDetails"
      ? t("camera_back_to_edit", {
          ns: "meals",
          defaultValue: "Back to edit",
        })
      : t("camera_back_to_meal", {
          ns: "meals",
          defaultValue: "Back to meal",
        });

  useEffect(() => {
    const onBackPress = () => {
      if (photoUri) {
        setPhotoUri(null);
        return true;
      }
      if (!mealFromRoute) return false;
      returnToOrigin();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [mealFromRoute, photoUri, returnToOrigin]);

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e) => {
      if (canLeaveRef.current) return;

      const actionType = e.data.action.type;
      const isBackAction =
        actionType === "GO_BACK" ||
        actionType === "POP" ||
        actionType === "POP_TO_TOP";
      if (!isBackAction) return;

      if (photoUri) {
        e.preventDefault();
        setPhotoUri(null);
        return;
      }
      if (!mealFromRoute) return;
      e.preventDefault();
      returnToOrigin();
    });
    return unsub;
  }, [navigation, photoUri, mealFromRoute, returnToOrigin]);

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
    const localPhotoUri = isLocalUri(finalUri) ? finalUri : null;
    const updated: Meal = {
      ...mealFromRoute,
      mealId,
      photoUrl: finalUri,
      photoLocalPath: localPhotoUri,
      localPhotoUrl: localPhotoUri,
      updatedAt: new Date().toISOString(),
    };
    await updateMeal(updated);
    replaceToOrigin(updated);
  };

  const handleRetake = () => setPhotoUri(null);

  if (!permission) {
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
        <View style={styles.flexBackground} />
      </Layout>
    );
  }

  if (!permission.granted) {
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
        <View style={styles.permissionWrap}>
          <Text style={styles.permissionText}>
            {t("camera_permission_message")}
          </Text>
          <Pressable
            onPress={requestPermission}
            style={styles.permissionButton}
            accessibilityRole="button"
            accessibilityLabel={t("continue", { defaultValue: "Continue" })}
          >
            <Text style={styles.permissionButtonLabel}>{t("continue")}</Text>
          </Pressable>
        </View>
      </Layout>
    );
  }

  if (photoUri) {
    return (
      <Layout showNavigation={false} disableScroll style={styles.layout}>
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
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.fill}>
        <View style={styles.cameraWrap}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            onCameraReady={() => setIsCameraReady(true)}
          />
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.shutterWrapper}>
              <Pressable
                style={({ pressed }) => [
                  styles.shutterButton,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={handleTakePicture}
                disabled={isTakingPhoto}
                accessibilityRole="button"
                accessibilityLabel={t("camera_take_photo", {
                  defaultValue: "Take photo",
                })}
              />
            </View>
            <View
              style={[
                styles.secondaryActionWrap,
                { paddingBottom: Math.max(insets.bottom, theme.spacing.md) },
              ]}
            >
              <Button
                variant="secondary"
                label={returnLabel}
                onPress={returnToOrigin}
                style={styles.secondaryActionButton}
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
                  accessibilityRole="button"
                  accessibilityLabel={t("dev.sample_meal", { ns: "meals" })}
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
    layout: {
      paddingTop: 0,
      paddingBottom: 0,
      paddingLeft: 0,
      paddingRight: 0,
    },
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
      fontSize: theme.typography.size.bodyM,
      textAlign: "center",
      marginBottom: theme.spacing.lg,
      color: theme.text,
    },
    permissionButton: {
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.lg + theme.spacing.xs,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.surfaceElevated,
    },
    permissionButtonLabel: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.bodyL,
      color: theme.text,
    },
    cameraWrap: { flex: 1, backgroundColor: theme.background },
    camera: { flex: 1 },
    shutterWrapper: {
      position: "absolute",
      bottom: 104,
      left: 0,
      right: 0,
      alignItems: "center",
      justifyContent: "flex-end",
    },
    secondaryActionWrap: {
      position: "absolute",
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      bottom: 0,
    },
    secondaryActionButton: {
      width: "100%",
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
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
    },
    devBtnText: {
      color: theme.text,
      fontSize: theme.typography.size.bodyS,
    },
  });
