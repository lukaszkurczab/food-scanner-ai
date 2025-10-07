import React, { useRef, useState, useEffect } from "react";
import { View, StyleSheet, Pressable, Text, BackHandler } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import Loader from "@feature/Meals/components/Loader";
import { useTranslation } from "react-i18next";
import { detectIngredientsWithVision } from "@/services/visionService";
import { extractNutritionFromTable } from "@/services/nutritionTableService";
import { extractNutritionFromTableLocal } from "@/services/localNutritionTable";
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
import { getSampleMealUri, getSampleTableUri } from "@/utils/devSamples";
import { debugScope } from "@/utils/debug";

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
  const { t } = useTranslation("common");
  const { uid } = useAuthContext();
  const { isPremium } = usePremiumContext();
  const route = useRoute<any>();
  const routeId = route.params?.id as string | undefined;
  const skipDetection = !!route.params?.skipDetection;
  const mealId = meal?.mealId || routeId || uuidv4();
  const canLeaveRef = useRef(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [mode, setMode] = useState<"ai" | "table" | "barcode">(
    isPremium ? "ai" : "barcode"
  );

  useEffect(() => {
    setMode((prev) =>
      isPremium ? (prev === "barcode" ? "ai" : prev) : "barcode"
    );
  }, [isPremium]);

  useEffect(() => {
    if (skipDetection) setMode("ai");
  }, [skipDetection]);

  useEffect(() => {
    if (mode !== "barcode" && scannedCode) setScannedCode(null);
  }, [mode]);

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
    log.log("takePicture start", {
      mode,
      skipDetection,
      isPremium,
      isCameraReady,
    });
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      try {
        if (mode === "table") {
          const uri = await getSampleTableUri();
          log.log("DEV sample table uri", uri);
          setPhotoUri(uri);
          return;
        } else if (mode === "ai") {
          const uri = await getSampleMealUri();
          log.log("DEV sample meal uri", uri);
          setPhotoUri(uri);
          return;
        }
      } catch (e) {
        log.warn("DEV sample load failed", e);
      }
    }
    if (mode === "barcode" && !skipDetection) {
      const code = scannedCode;
      if (!code) {
        setBarcodeModal(true);
        return;
      }
      setIsLoading(true);
      try {
        const off = await fetchProductByBarcode(code);
        const name = off?.name || `Barcode ${code}`;
        if (!meal) {
          setMeal({
            mealId,
            userUid: uid || "",
            name,
            photoUrl: null,
            ingredients: off ? [off.ingredient] : [],
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
            name,
            notes: `barcode:${code}`,
            ingredients: off ? [off.ingredient] : meal.ingredients || [],
          } as any);
        }
      } finally {
        setIsLoading(false);
      }
      canLeaveRef.current = true;
      navigation.replace("ReviewIngredients");
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
          onAccept={async (optimized) => {
            if (mode === "table") {
              const finalUri = optimized || photoUri;
              log.log("TABLE mode accept", { finalUri });
              setIsLoading(true);
              try {
                if (!meal) {
                  setMeal({
                    mealId,
                    userUid: uid || "",
                    name: null,
                    photoUrl: null,
                    ingredients: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    syncState: "pending",
                    tags: [],
                    deleted: false,
                    notes: null,
                    type: "other",
                    timestamp: "",
                    source: "manual",
                    cloudId: undefined,
                  } as any);
                }
                let ings = await extractNutritionFromTableLocal(finalUri);
                log.log("Local OCR result", ings);
                if ((!ings || !ings.length) && isPremium) {
                  log.log("Local failed → remote fallback");
                  ings = await extractNutritionFromTable(uid || "", finalUri);
                  log.log("Remote OCR result", ings);
                }
                if (ings && ings.length) {
                  updateMeal({ ingredients: ings, mealId });
                  setIsLoading(false);
                  canLeaveRef.current = true;
                  navigation.replace("ReviewIngredients");
                  return;
                }
              } catch (e) {
                log.error("TABLE pipeline error", e);
              }
              setIsLoading(false);
              canLeaveRef.current = true;
              navigation.replace("ReviewIngredients");
              return;
            }
            await handleAccept(optimized);
          }}
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
            {!skipDetection && (
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
                  onPress={() => setMode("table")}
                  style={[
                    styles.modeBtn,
                    {
                      backgroundColor:
                        mode === "table" ? theme.accentSecondary : theme.card,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="table-chart"
                    size={22}
                    color={mode === "table" ? theme.onAccent : theme.text}
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
                    {t("dev.sample_meal", { ns: "meals" })}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    const uri = await getSampleTableUri();
                    setMode("table");
                    setPhotoUri(uri);
                  }}
                  style={[
                    styles.devBtn,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <Text style={{ color: theme.text }}>
                    {t("dev.sample_table", { ns: "meals" })}
                  </Text>
                </Pressable>
              </View>
            )}
            {!skipDetection && mode === "barcode" && scannedCode && (
              <View style={styles.detectBadge}>
                <Text style={{ color: theme.onAccent, fontWeight: "bold" }}>
                  {t("barcode_detected", { defaultValue: "Detected:" })}{" "}
                  {scannedCode}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <AppAlert
        visible={premiumModal}
        title={t("premium_required_title", {
          defaultValue: "Premium required",
        })}
        message={t("premium_required_body", {
          defaultValue: "AI mode requires a Premium subscription.",
        })}
        onClose={() => setPremiumModal(false)}
        primaryAction={{
          label: t("go_premium", { defaultValue: "Go Premium" }),
          onPress: () => {
            setPremiumModal(false);
            navigation.navigate("ManageSubscription");
          },
        }}
        secondaryAction={{
          label: t("cancel", { defaultValue: "Cancel", ns: "common" }),
          onPress: () => setPremiumModal(false),
        }}
      />
      <AppAlert
        visible={barcodeModal}
        title={t("barcode_no_code_title", {
          defaultValue: "No barcode detected",
        })}
        message={t("barcode_no_code_msg", {
          defaultValue:
            "Place the code in the frame and try again, then press the button.",
        })}
        onClose={() => setBarcodeModal(false)}
        primaryAction={{
          label: t("ok", { defaultValue: "OK" }),
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
    bottom: 88,
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
