import React, { useRef, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  BackHandler,
  DeviceEventEmitter,
  Linking,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import Loader from "@feature/Meals/components/Loader";
import { useTranslation } from "react-i18next";
import { detectIngredientsWithVision } from "@/services/visionService";
import {
  fetchProductByBarcode,
  extractBarcodeFromPayload,
} from "@/services/barcodeService";
import { useRoute } from "@react-navigation/native";
import { useAuthContext } from "@/context/AuthContext";
import { Layout, PhotoPreview } from "@/components";
import { usePremiumContext } from "@/context/PremiumContext";
import { MaterialIcons } from "@expo/vector-icons";
import { Alert as AppAlert } from "@/components/Alert";
import { getSampleMealUri } from "@/utils/devSamples";
import { debugScope } from "@/utils/debug";
import { useUserContext } from "@contexts/UserContext";
import type { RootStackParamList } from "@/navigation/navigate";
import type { Ingredient } from "@/types";

const log = debugScope("Screen:MealCamera");

export default function MealCameraScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [premiumModal, setPremiumModal] = useState(false);
  const [barcodeModal, setBarcodeModal] = useState(false);
  const { meal, setMeal, updateMeal, setLastScreen } = useMealDraftContext();
  const { t: tCommon } = useTranslation("common");
  const { t: tMeals } = useTranslation("meals");
  const { uid } = useAuthContext();
  const { language } = useUserContext();
  const { isPremium } = usePremiumContext();
  const route = useRoute<any>();

  const barcodeOnly = !!route.params?.barcodeOnly;
  const routeId = route.params?.id as string | undefined;
  const skipDetection = !!route.params?.skipDetection;
  const returnTo =
    (route.params?.returnTo as keyof RootStackParamList) || "ReviewIngredients";
  const attempt = (route.params?.attempt as number | undefined) || 1;

  const mealId = meal?.mealId || routeId || uuidv4();
  const canLeaveRef = useRef(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [mode, setMode] = useState<"ai" | "barcode">(
    barcodeOnly ? "barcode" : isPremium ? "ai" : "barcode"
  );

  useEffect(() => {
    if (barcodeOnly) return;
    setMode((prev) =>
      isPremium ? (prev === "barcode" ? "ai" : prev) : "barcode"
    );
  }, [isPremium, barcodeOnly]);

  useEffect(() => {
    if (barcodeOnly) return;
    if (skipDetection) setMode("ai");
  }, [skipDetection, barcodeOnly]);

  useEffect(() => {
    if (mode !== "barcode" && scannedCode) setScannedCode(null);
  }, [mode, scannedCode]);

  useEffect(() => {
    if (uid && setLastScreen) setLastScreen(uid, "MealCamera");
  }, [setLastScreen, uid]);

  useEffect(() => {
    const onBackPress = () => {
      if (photoUri) {
        setPhotoUri(null);
        return true;
      }
      canLeaveRef.current = true;
      navigation.replace(returnTo as any);
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [photoUri, navigation, returnTo]);

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      if (canLeaveRef.current) return;
      e.preventDefault();
      if (photoUri) {
        setPhotoUri(null);
        return;
      }
      canLeaveRef.current = true;
      navigation.replace(returnTo as any);
    });
    return unsub;
  }, [navigation, photoUri, returnTo]);

  const handleBarcodeFlow = async (code: string) => {
    setIsLoading(true);
    try {
      const off = await fetchProductByBarcode(code);

      if (!off || off === null) {
        canLeaveRef.current = true;
        navigation.replace("BarcodeProductNotFound" as any, {
          code,
          attempt,
          returnTo,
        });
        return;
      }

      const { ingredient, name } = off;

      if (barcodeOnly) {
        DeviceEventEmitter.emit("barcode.scanned.ingredient", {
          ingredient,
        } as { ingredient: Ingredient });
        canLeaveRef.current = true;
        navigation.replace(returnTo as any);
        return;
      }

      const resolvedName = name || `Barcode ${code}`;

      if (!meal) {
        setMeal({
          mealId,
          userUid: uid || "",
          name: resolvedName,
          photoUrl: null,
          ingredients: [ingredient],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncState: "pending",
          tags: [],
          deleted: false,
          notes: `barcode:${code}`,
          type: "other",
          timestamp: "",
          source: "manual",
          cloudId: undefined,
        } as any);
      } else {
        updateMeal({
          mealId,
          name: resolvedName,
          notes: `barcode:${code}`,
          ingredients: [ingredient],
        } as any);
      }

      canLeaveRef.current = true;
      navigation.replace("ReviewIngredients" as any);
    } catch {
      canLeaveRef.current = true;
      navigation.replace("BarcodeProductNotFound" as any, {
        code,
        attempt,
        returnTo,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTakePicture = async () => {
    log.log("takePicture start", {
      mode,
      skipDetection,
      isPremium,
      isCameraReady,
      barcodeOnly,
    });

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      try {
        const uri = await getSampleMealUri();
        log.log("DEV sample meal uri", uri);
        setPhotoUri(uri);
        return;
      } catch {}
    }

    if (mode === "barcode" && !skipDetection) {
      if (!scannedCode) {
        setBarcodeModal(true);
        return;
      }
      await handleBarcodeFlow(scannedCode);
      return;
    }

    if (isTakingPhoto || !isCameraReady || !cameraRef.current) return;
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
      if (photo?.uri) {
        setPhotoUri(photo.uri);
      }
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
          ? await detectIngredientsWithVision(uid, finalUri, {
              isPremium: !!isPremium,
              lang: language,
            })
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
              marginBottom: 12,
              color: theme.text,
              fontWeight: "700",
            }}
          >
            {tCommon("camera_permission_title")}
          </Text>

          <Text
            style={{
              fontSize: 16,
              textAlign: "center",
              marginBottom: 20,
              color: theme.text,
              opacity: 0.9,
            }}
          >
            {blocked
              ? tMeals("camera_permission_blocked_message")
              : tCommon("camera_permission_message")}
          </Text>

          <Pressable
            onPress={blocked ? () => Linking.openSettings() : requestPermission}
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
              {blocked ? tCommon("open_settings") : tCommon("continue")}
            </Text>
          </Pressable>
        </View>
      </Layout>
    );
  }

  if (isLoading) {
    const isBarcodeFlow = mode === "barcode" && !skipDetection;
    return (
      <Layout>
        <Loader
          text={
            isBarcodeFlow
              ? tCommon("barcode_loader_title", "Looking up product...")
              : tCommon("camera_loader_title", "Analyzing your meal...")
          }
          subtext={
            isBarcodeFlow
              ? tCommon(
                  "barcode_loader_subtext",
                  "Fetching product data from the database."
                )
              : tCommon("camera_loader_subtext", "This may take a few seconds.")
          }
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
          secondaryText={tCommon("camera_retake")}
          primaryText={tCommon("camera_use_photo")}
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
            onBarcodeScanned={({ data }: { data: string }) => {
              if (mode !== "barcode") return;
              if (!data) return;
              const code = extractBarcodeFromPayload(data);
              if (!code) return;
              setScannedCode((prev) => (prev === code ? prev : code));
            }}
            barcodeScannerSettings={
              {
                barcodeTypes: [
                  "ean13",
                  "ean8",
                  "upc_a",
                  "upc_e",
                  "qr",
                  "code128",
                ],
              } as any
            }
          />
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.overlay} pointerEvents="none" />
            {!skipDetection && !barcodeOnly && (
              <View style={styles.modeSwitch}>
                <Pressable
                  onPress={() =>
                    isPremium ? setMode("ai") : setPremiumModal(true)
                  }
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor:
                        mode === "ai" ? theme.accentSecondary : theme.card,
                      borderColor: theme.border,
                      opacity: isPremium ? 1 : 0.6,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="psychology"
                    size={22}
                    color={mode === "ai" ? theme.onAccent : theme.text}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setMode("barcode")}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor:
                        mode === "barcode" ? theme.accentSecondary : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="qr-code-scanner"
                    size={22}
                    color={mode === "barcode" ? theme.onAccent : theme.text}
                  />
                </Pressable>
              </View>
            )}
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
                    setMode("ai");
                    setPhotoUri(uri);
                  }}
                  style={[
                    styles.devBtn,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={{ color: theme.text }}>
                    {tMeals("dev.sample_meal")}
                  </Text>
                </Pressable>
              </View>
            )}
            {!skipDetection && mode === "barcode" && scannedCode && (
              <View style={styles.detectBadge}>
                <Text style={{ color: theme.onAccent, fontWeight: "bold" }}>
                  {tMeals("barcode_detected", { defaultValue: "Detected:" })}{" "}
                  {scannedCode}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <AppAlert
        visible={premiumModal}
        title={tMeals("premium_required_title", {
          defaultValue: "Premium required",
        })}
        message={tMeals("premium_required_body", {
          defaultValue: "AI mode requires a Premium subscription.",
        })}
        onClose={() => setPremiumModal(false)}
        primaryAction={{
          label: tMeals("go_premium", { defaultValue: "Go Premium" }),
          onPress: () => {
            setPremiumModal(false);
            navigation.navigate("ManageSubscription");
          },
        }}
        secondaryAction={{
          label: tCommon("cancel"),
          onPress: () => setPremiumModal(false),
        }}
      />
      <AppAlert
        visible={barcodeModal}
        title={tMeals("barcode_no_code_title", {
          defaultValue: "No barcode detected",
        })}
        message={tMeals("barcode_no_code_msg", {
          defaultValue:
            "Place the code in the frame and try again, then press the button.",
        })}
        onClose={() => setBarcodeModal(false)}
        primaryAction={{
          label: tCommon("confirm", { defaultValue: "OK" }),
          onPress: () => setBarcodeModal(false),
        }}
      />
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
  modeSwitch: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  modeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 6,
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
  detectBadge: {
    position: "absolute",
    bottom: 188,
    left: 16,
    right: 16,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
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
