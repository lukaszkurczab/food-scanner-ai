import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler, DeviceEventEmitter } from "react-native";
import { CameraView, useCameraPermissions, type BarcodeType } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { detectIngredientsWithVision } from "@/services/ai/visionService";
import {
  fetchProductByBarcode,
  extractBarcodeFromPayload,
} from "@/services/barcode/barcodeService";
import { getSampleMealUri } from "@/utils/devSamples";
import { debugScope } from "@/utils/debug";
import { useAuthContext } from "@/context/AuthContext";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import { getErrorStatus } from "@/services/contracts/serviceError";
import { useUserContext } from "@contexts/UserContext";
import { getAiUxErrorType } from "@/services/ai/uxError";
import type { Ingredient, Meal } from "@/types";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { getMealAiMetaFromAiResponse } from "@/services/meals/mealMetadata";

const log = debugScope("Hook:useMealCameraState");

const getRecognitionFailureReason = (
  error: unknown,
): "offline" | "timeout" | "ai_unavailable" | "not_recognized" => {
  const errorType = getAiUxErrorType(error);
  if (errorType === "offline") return "offline";
  if (errorType === "timeout") return "timeout";
  if (errorType === "unavailable") return "ai_unavailable";
  return "not_recognized";
};

export function useMealCameraState({
  navigation,
  flow,
  params,
}: Pick<MealAddScreenProps<"MealCamera">, "navigation" | "flow" | "params">) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [premiumModal, setPremiumModal] = useState(false);
  const [barcodeModal, setBarcodeModal] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  const { meal, setMeal, updateMeal, setLastScreen, saveDraft } =
    useMealDraftContext();
  const { uid } = useAuthContext();
  const { language } = useUserContext();
  const { credits, canAfford, refreshCredits, applyCreditsFromResponse } = useAiCreditsContext();
  const isPremium = credits?.tier === "premium";

  const barcodeOnly = !!params?.barcodeOnly;
  const routeId = params?.id as string | undefined;
  const skipDetection = !!params?.skipDetection;
  const returnTo = params?.returnTo || "Result";
  const attempt = params?.attempt || 1;

  const fallbackMealIdRef = useRef<string>(uuidv4());
  const mealId = meal?.mealId || routeId || fallbackMealIdRef.current;

  const [mode, setMode] = useState<"ai" | "barcode">(
    barcodeOnly ? "barcode" : "ai",
  );

  useEffect(() => {
    if (barcodeOnly) return;
    if (skipDetection) setMode("ai");
  }, [skipDetection, barcodeOnly]);

  useEffect(() => {
    if (mode !== "barcode" && scannedCode) setScannedCode(null);
  }, [mode, scannedCode]);

  useEffect(() => {
    if (uid && setLastScreen) {
      void setLastScreen(uid, "MealCamera");
    }
  }, [setLastScreen, uid]);

  useEffect(() => {
    const onBackPress = () => {
      if (photoUri) {
        setPhotoUri(null);
        return true;
      }
      if (flow.canGoBack()) {
        flow.goBack();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [photoUri, flow]);

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
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

      if (flow.canGoBack()) {
        e.preventDefault();
        flow.goBack();
      }
    });

    return sub;
  }, [flow, navigation, photoUri]);

  const handleBarcodeFlow = useCallback(
    async (code: string) => {
      setIsLoading(true);
      try {
        const off = await fetchProductByBarcode(code);

        if (!off) {
          flow.goTo("BarcodeProductNotFound", {
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
          flow.goTo(returnTo, {});
          return;
        }

        const resolvedName = name || `Barcode ${code}`;

        if (!meal) {
          const nextMeal: Meal = {
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
            inputMethod: "barcode",
            aiMeta: null,
          };
          setMeal(nextMeal);
          if (uid) {
            await saveDraft(uid, nextMeal);
          }
        } else {
          const nextMeal: Meal = {
            ...meal,
            mealId,
            name: resolvedName,
            notes: `barcode:${code}`,
            ingredients: [ingredient],
            inputMethod: "barcode",
            aiMeta: null,
            updatedAt: new Date().toISOString(),
          };
          updateMeal({
            mealId,
            name: resolvedName,
            notes: `barcode:${code}`,
            ingredients: [ingredient],
            inputMethod: "barcode",
            aiMeta: null,
          });
          if (uid) {
            await saveDraft(uid, nextMeal);
          }
        }

        flow.goTo("Result", {});
      } catch {
        flow.goTo("BarcodeProductNotFound", {
          code,
          attempt,
          returnTo,
        });
      } finally {
        setIsLoading(false);
      }
    },
    [
      attempt,
      barcodeOnly,
      flow,
      meal,
      mealId,
      returnTo,
      saveDraft,
      setMeal,
      uid,
      updateMeal,
    ],
  );

  const handleTakePicture = useCallback(async () => {
    const canUsePhotoAi = canAfford("photo");
    log.log("takePicture start", {
      mode,
      skipDetection,
      canUsePhotoAi,
      isCameraReady,
      barcodeOnly,
    });

    if (typeof __DEV__ !== "undefined" && __DEV__) {
      try {
        const uri = await getSampleMealUri();
        setPhotoUri(uri);
        return;
      } catch {
        // Ignore missing local sample image in development mode.
      }
    }

    if (mode === "barcode" && !skipDetection) {
      if (!scannedCode) {
        setBarcodeModal(true);
        return;
      }
      await handleBarcodeFlow(scannedCode);
      return;
    }

    if (mode === "ai" && !skipDetection && !canUsePhotoAi) {
      setPremiumModal(true);
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
  }, [
    barcodeOnly,
    canAfford,
    handleBarcodeFlow,
    isCameraReady,
    isTakingPhoto,
    mode,
    scannedCode,
    skipDetection,
  ]);

  const handleAccept = useCallback(
    async (optimizedUri?: string) => {
      const finalUri = optimizedUri || photoUri;
      if (!finalUri) return;

      setIsLoading(true);
      try {
        let draftAfterPhoto: Meal;
        if (!meal) {
          draftAfterPhoto = {
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
            inputMethod: "photo",
            aiMeta: null,
          };
          setMeal(draftAfterPhoto);
        } else {
          draftAfterPhoto = {
            ...meal,
            mealId,
            photoUrl: finalUri,
            inputMethod: meal.inputMethod ?? "photo",
            updatedAt: new Date().toISOString(),
          };
          updateMeal({
            photoUrl: finalUri,
            mealId,
            inputMethod: meal.inputMethod ?? "photo",
          });
        }
        if (uid) {
          await saveDraft(uid, draftAfterPhoto);
        }

        if (!skipDetection) {
          const analyzeResult = uid
            ? await detectIngredientsWithVision(uid, finalUri, {
                lang: language,
              })
            : null;
          const ingredients = analyzeResult?.ingredients ?? null;

          if (analyzeResult?.credits) {
            applyCreditsFromResponse(analyzeResult.credits);
          }

          if (ingredients && ingredients.length > 0) {
            const aiMeta = analyzeResult
              ? getMealAiMetaFromAiResponse(analyzeResult.credits)
              : null;
            const analyzedMeal: Meal = {
              ...draftAfterPhoto,
              ingredients,
              photoUrl: finalUri,
              source: "ai",
              inputMethod: "photo",
              aiMeta,
              updatedAt: new Date().toISOString(),
            };
            updateMeal({
              ingredients,
              mealId,
              photoUrl: finalUri,
              source: "ai",
              inputMethod: "photo",
              aiMeta,
            });
            if (uid) {
              await saveDraft(uid, analyzedMeal);
            }
          } else {
            setIsLoading(false);
            flow.goTo("IngredientsNotRecognized", {
              image: finalUri,
              id: mealId,
              attempt,
              reason: "not_recognized",
            });
            return;
          }
        }
      } catch (error: unknown) {
        if (getErrorStatus(error) === 402) {
          await refreshCredits();
          setIsLoading(false);
          setPremiumModal(true);
          return;
        }

        setIsLoading(false);
        flow.goTo("IngredientsNotRecognized", {
          image: finalUri,
          id: mealId,
          attempt,
          reason: getRecognitionFailureReason(error),
        });
        return;
      }

      setIsLoading(false);
      flow.goTo("Result", {});
    },
    [
      attempt,
      applyCreditsFromResponse,
      flow,
      language,
      meal,
      mealId,
      photoUri,
      refreshCredits,
      setMeal,
      saveDraft,
      skipDetection,
      uid,
      updateMeal,
    ],
  );

  const handleRetake = useCallback(() => {
    setPhotoUri(null);
  }, []);

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (mode !== "barcode") return;
      if (!data) return;
      const code = extractBarcodeFromPayload(data);
      if (!code) return;
      setScannedCode((prev) => (prev === code ? prev : code));
    },
    [mode],
  );

  const onUseSample = useCallback(async () => {
    const uri = await getSampleMealUri();
    setMode("ai");
    setPhotoUri(uri);
  }, []);

  const openAiMode = useCallback(() => {
    if (canAfford("photo")) {
      setMode("ai");
      return;
    }
    setPremiumModal(true);
  }, [canAfford]);

  const openBarcodeMode = useCallback(() => {
    setMode("barcode");
  }, []);

  const closePremiumModal = useCallback(() => {
    setPremiumModal(false);
  }, []);

  const closeBarcodeModal = useCallback(() => {
    setBarcodeModal(false);
  }, []);

  const goManagePremium = useCallback(() => {
    setPremiumModal(false);
    navigation.navigate("ManageSubscription");
  }, [navigation]);

  const barcodeTypes = useMemo<BarcodeType[]>(
    () => ["ean13", "ean8", "upc_a", "upc_e", "qr", "code128"],
    [],
  );

  const showBarcodeOverlay = !skipDetection && mode === "barcode";

  return {
    permission,
    requestPermission,
    cameraRef,
    isCameraReady,
    isTakingPhoto,
    photoUri,
    isLoading,
    premiumModal,
    barcodeModal,
    scannedCode,
    mode,
    isPremium,
    canUsePhotoAi: canAfford("photo"),
    skipDetection,
    barcodeOnly,
    showBarcodeOverlay,
    barcodeTypes,
    setIsCameraReady,
    handleTakePicture,
    handleAccept,
    handleRetake,
    onBarcodeScanned,
    onUseSample,
    openAiMode,
    openBarcodeMode,
    closePremiumModal,
    closeBarcodeModal,
    goManagePremium,
  };
}
