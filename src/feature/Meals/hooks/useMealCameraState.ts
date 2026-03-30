import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { v4 as uuidv4 } from "uuid";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { getSampleMealUri } from "@/utils/devSamples";
import { debugScope } from "@/utils/debug";
import { useAuthContext } from "@/context/AuthContext";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import { getErrorStatus } from "@/services/contracts/serviceError";
import type { Meal } from "@/types";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";

const log = debugScope("Hook:useMealCameraState");

export function useMealCameraState({
  navigation,
  flow,
  params,
}: Pick<MealAddScreenProps<"CameraDefault">, "navigation" | "flow" | "params">) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [premiumModal, setPremiumModal] = useState(
    Boolean(params?.showPremiumModal),
  );

  const { meal, setMeal, updateMeal, setLastScreen, saveDraft } =
    useMealDraftContext();
  const { uid } = useAuthContext();
  const { canAfford } = useAiCreditsContext();

  const routeId = params?.id as string | undefined;
  const skipDetection = !!params?.skipDetection;
  const attempt = params?.attempt || 1;

  const fallbackMealIdRef = useRef<string>(uuidv4());
  const mealId = meal?.mealId || routeId || fallbackMealIdRef.current;

  useEffect(() => {
    setPremiumModal(Boolean(params?.showPremiumModal));
  }, [params?.showPremiumModal]);

  useEffect(() => {
    if (uid && setLastScreen) {
      void setLastScreen(uid, "CameraDefault");
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

  const handleTakePicture = useCallback(async () => {
    const canUsePhotoAi = canAfford("photo");
    log.log("takePicture start", {
      skipDetection,
      canUsePhotoAi,
      isCameraReady,
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

    if (!skipDetection && !canUsePhotoAi) {
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
    canAfford,
    isCameraReady,
    isTakingPhoto,
    skipDetection,
  ]);

  const handleAccept = useCallback(
    async (optimizedUri?: string) => {
      const finalUri = optimizedUri || photoUri;
      if (!finalUri) return;

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
      } catch (error: unknown) {
        if (getErrorStatus(error) === 402) {
          setPremiumModal(true);
        }
        return;
      }

      setPhotoUri(null);

      if (skipDetection || !uid) {
        flow.replace("ReviewMeal", {});
        return;
      }

      flow.goTo("PreparingReviewPhoto", {
        image: finalUri,
        id: mealId,
        attempt,
      });
    },
    [
      attempt,
      flow,
      meal,
      mealId,
      photoUri,
      saveDraft,
      setMeal,
      skipDetection,
      uid,
    ],
  );

  const handleRetake = useCallback(() => {
    setPhotoUri(null);
  }, []);

  const onUseSample = useCallback(async () => {
    const uri = await getSampleMealUri();
    setPhotoUri(uri);
  }, []);

  const closePremiumModal = useCallback(() => {
    setPremiumModal(false);
  }, []);

  const goManagePremium = useCallback(() => {
    setPremiumModal(false);
    navigation.navigate("ManageSubscription");
  }, [navigation]);

  return {
    permission,
    requestPermission,
    cameraRef,
    isCameraReady,
    isTakingPhoto,
    photoUri,
    premiumModal,
    canUsePhotoAi: canAfford("photo"),
    skipDetection,
    setIsCameraReady,
    handleTakePicture,
    handleAccept,
    handleRetake,
    onUseSample,
    closePremiumModal,
    goManagePremium,
  };
}
