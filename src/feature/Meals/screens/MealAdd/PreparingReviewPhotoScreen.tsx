import { useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { Layout } from "@/components";
import Loader from "@feature/Meals/components/Loader";
import { useTranslation } from "react-i18next";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import { useAuthContext } from "@/context/AuthContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useUserContext } from "@contexts/UserContext";
import { detectIngredientsWithVision } from "@/services/ai/visionService";
import { getAiUxErrorType } from "@/services/ai/uxError";
import { getErrorStatus } from "@/services/contracts/serviceError";
import { getMealAiMetaFromAiResponse } from "@/services/meals/mealMetadata";
import type { Meal } from "@/types";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";

const getRecognitionFailureReason = (
  error: unknown,
): "offline" | "timeout" | "ai_unavailable" | "not_recognized" => {
  const errorType = getAiUxErrorType(error);
  if (errorType === "offline") return "offline";
  if (errorType === "timeout") return "timeout";
  if (errorType === "unavailable") return "ai_unavailable";
  return "not_recognized";
};

const buildFallbackPhotoDraft = (uid: string, image: string, id?: string): Meal => ({
  mealId: id || uuidv4(),
  userUid: uid,
  name: null,
  photoUrl: image,
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
});

export default function PreparingReviewPhotoScreen({
  flow,
  params,
}: MealAddScreenProps<"PreparingReviewPhoto">) {
  const { t } = useTranslation(["common", "meals"]);
  const { uid } = useAuthContext();
  const { language } = useUserContext();
  const { meal, saveDraft, setMeal, updateMeal } = useMealDraftContext();
  const { applyCreditsFromResponse, refreshCredits } = useAiCreditsContext();

  useEffect(() => {
    let cancelled = false;

    const analyze = async () => {
      if (!params.image || !uid) {
        if (!cancelled) {
          flow.replace("ReviewMeal", {});
        }
        return;
      }

      try {
        const analyzeResult = await detectIngredientsWithVision(uid, params.image, {
          lang: language,
        });
        const ingredients = analyzeResult?.ingredients ?? null;

        if (analyzeResult?.credits) {
          applyCreditsFromResponse(analyzeResult.credits);
        }

        if (!ingredients || ingredients.length === 0) {
          if (!cancelled) {
            flow.replace("IngredientsNotRecognized", {
              image: params.image,
              id: params.id,
              attempt: params.attempt,
              reason: "not_recognized",
            });
          }
          return;
        }

        const aiMeta = analyzeResult
          ? getMealAiMetaFromAiResponse(analyzeResult.credits)
          : null;
        const draftBase =
          meal ?? buildFallbackPhotoDraft(uid, params.image, params.id);
        const analyzedMeal: Meal = {
          ...draftBase,
          mealId: draftBase.mealId || params.id || uuidv4(),
          photoUrl: params.image,
          ingredients,
          source: "ai",
          inputMethod: "photo",
          aiMeta,
          updatedAt: new Date().toISOString(),
        };

        if (!meal) {
          setMeal(analyzedMeal);
        } else {
          updateMeal({
            mealId: analyzedMeal.mealId,
            photoUrl: params.image,
            ingredients,
            source: "ai",
            inputMethod: "photo",
            aiMeta,
          });
        }

        await saveDraft(uid, analyzedMeal);

        if (!cancelled) {
          flow.replace("ReviewMeal", {});
        }
      } catch (error) {
        if (getErrorStatus(error) === 402) {
          await refreshCredits();
          if (!cancelled) {
            flow.replace("CameraDefault", {
              id: params.id,
              attempt: params.attempt,
              showPremiumModal: true,
            });
          }
          return;
        }

        if (!cancelled) {
          flow.replace("IngredientsNotRecognized", {
            image: params.image,
            id: params.id,
            attempt: params.attempt,
            reason: getRecognitionFailureReason(error),
          });
        }
      }
    };

    void analyze();

    return () => {
      cancelled = true;
    };
  }, [
    applyCreditsFromResponse,
    flow,
    language,
    meal,
    params.attempt,
    params.id,
    params.image,
    refreshCredits,
    saveDraft,
    setMeal,
    uid,
    updateMeal,
  ]);

  return (
    <Layout showNavigation={false} disableScroll>
      <Loader
        text={t("camera_loader_title", {
          ns: "common",
          defaultValue: "Preparing your meal review...",
        })}
        subtext={t("preparing_review_subtitle", {
          ns: "meals",
          defaultValue: "We are analyzing the photo and building a draft for review.",
        })}
      />
    </Layout>
  );
}
