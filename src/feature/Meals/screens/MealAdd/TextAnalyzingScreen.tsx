import { useEffect, useMemo } from "react";
import NetInfo from "@react-native-community/netinfo";
import { StyleSheet, View } from "react-native";
import { Layout, TextInput, Toast } from "@/components";
import { useTranslation } from "react-i18next";
import { useAiCreditsContext } from "@/context/AiCreditsContext";
import { useAuthContext } from "@/context/AuthContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { useUserContext } from "@contexts/UserContext";
import type { Meal } from "@/types";
import type { MealAddScreenProps } from "@/feature/Meals/feature/MapMealAddScreens";
import { extractIngredientsFromText } from "@/services/ai/textMealService";
import type { AiTextMealPayload } from "@/services/ai/contracts";
import { getErrorStatus } from "@/services/contracts/serviceError";
import { getAiUxErrorType } from "@/services/ai/uxError";
import { getMealAiMetaFromAiResponse } from "@/services/meals/mealMetadata";
import { AiCreditsBadge } from "@/components/AiCreditsBadge";
import {
  MealAddPhotoScaffold,
  MealAddStatusBanner,
} from "@/feature/Meals/components/MealAddPhotoScaffold";
import { useTheme } from "@/theme/useTheme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { v4 as uuidv4 } from "uuid";

const MAX_RETRIES = 3;
const TEXT_PREVIEW_HEIGHT = 441;

const nextRetryCount = (current: number) => Math.min(current + 1, MAX_RETRIES);

const buildPayload = (
  params: MealAddScreenProps<"TextAnalyzing">["params"],
): AiTextMealPayload => ({
  name: params.name.trim() || null,
  ingredients: params.quickDescription.trim() || params.name.trim() || null,
  amount_g: null,
  notes: null,
});

const buildInitialMeal = (uid: string): Meal => ({
  mealId: uuidv4(),
  userUid: uid,
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
  source: "ai",
  inputMethod: "text",
  aiMeta: null,
  cloudId: undefined,
});

export default function TextAnalyzingScreen({
  flow,
  params,
}: MealAddScreenProps<"TextAnalyzing">) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation(["meals", "chat"]);
  const { uid } = useAuthContext();
  const { language } = useUserContext();
  const { meal, saveDraft, setLastScreen, setMeal } = useMealDraftContext();
  const { applyCreditsFromResponse, refreshCredits } = useAiCreditsContext();
  const previewTopInset = useMemo(
    () =>
      Math.max(
        theme.spacing.xxl,
        Math.round(insets.top * 0.65) + theme.spacing.xs,
      ),
    [insets.top, theme.spacing.xs, theme.spacing.xxl],
  );

  useEffect(() => {
    let cancelled = false;

    const replaceDescribeMeal = (
      patch: Partial<MealAddScreenProps<"DescribeMeal">["params"]>,
    ) => {
      if (cancelled) return;
      flow.replace("DescribeMeal", {
        name: params.name,
        quickDescription: params.quickDescription,
        retries: params.retries ?? 0,
        ...patch,
      });
    };

    const analyze = async () => {
      if (!uid) {
        replaceDescribeMeal({
          submitError: t("text_ai_error_auth"),
        });
        return;
      }

      try {
        const net = await NetInfo.fetch();
        if (!net.isConnected) {
          replaceDescribeMeal({
            submitError: t("text_ai_error_offline"),
          });
          return;
        }

        const result = await extractIngredientsFromText(
          uid,
          buildPayload(params),
          {
            lang: language || "en",
          },
        );

        if (!result || result.ingredients.length === 0) {
          const retries = nextRetryCount(params.retries ?? 0);
          Toast.show(t("not_recognized_title"));
          replaceDescribeMeal({
            retries,
            submitError: t("text_ai_not_recognized_retry"),
          });
          return;
        }

        applyCreditsFromResponse(result.credits);
        const aiMeta = getMealAiMetaFromAiResponse(result.credits);
        const baseMeal = meal ?? buildInitialMeal(uid);

        if (!meal) {
          setMeal(baseMeal);
          await saveDraft(uid, baseMeal);
        }

        const nextMeal: Meal = {
          ...baseMeal,
          name: params.name.trim() || baseMeal.name,
          notes: params.quickDescription.trim() || baseMeal.notes || null,
          ingredients: result.ingredients,
          source: "ai",
          inputMethod: "text",
          aiMeta,
          updatedAt: new Date().toISOString(),
        };

        setMeal(nextMeal);
        await saveDraft(uid, nextMeal);
        await setLastScreen(uid, "AddMeal");

        if (!cancelled) {
          flow.replace("ReviewMeal", {});
        }
      } catch (error) {
        if (getErrorStatus(error) === 402) {
          await refreshCredits();
          replaceDescribeMeal({
            showLimitModal: true,
          });
          return;
        }

        const errorType = getAiUxErrorType(error);
        if (errorType === "offline") {
          replaceDescribeMeal({
            submitError: t("text_ai_error_offline"),
          });
          return;
        }
        if (errorType === "timeout") {
          replaceDescribeMeal({
            submitError: t("text_ai_error_timeout"),
          });
          return;
        }
        if (errorType === "unavailable") {
          replaceDescribeMeal({
            submitError: t("text_ai_error_unavailable"),
          });
          return;
        }
        if (errorType === "auth") {
          replaceDescribeMeal({
            submitError: t("text_ai_error_auth"),
          });
          return;
        }

        const retries = nextRetryCount(params.retries ?? 0);
        Toast.show(t("text_ai_analyze_failed"));
        replaceDescribeMeal({
          retries,
          submitError: t("text_ai_analyze_failed"),
        });
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
    params,
    refreshCredits,
    saveDraft,
    setLastScreen,
    setMeal,
    t,
    uid,
  ]);

  return (
    <Layout showNavigation={false} disableScroll style={styles.layout}>
      <View style={styles.fill}>
        <MealAddPhotoScaffold
          topInset={previewTopInset}
          previewHeight={TEXT_PREVIEW_HEIGHT}
          preview={
            <View style={styles.preview}>
              <TextInput
                label={t("meal_name", { ns: "meals" })}
                value={params.name}
                onChangeText={() => {}}
                editable={false}
                style={styles.previewNameField}
              />
              <TextInput
                label={t("describe_meal_quick_description_label", {
                  ns: "meals",
                })}
                value={params.quickDescription}
                onChangeText={() => {}}
                editable={false}
                style={styles.previewDescriptionField}
                multiline
                numberOfLines={8}
              />
            </View>
          }
          eyebrow={t("text_analyzing_overline")}
          title={t("text_analyzing_title")}
          description={t("text_analyzing_subtitle")}
          accessory={
            <AiCreditsBadge
              text={`✦ ${String(t("credits.costSingle", { ns: "chat" }))}`}
              tone="success"
            />
          }
          content={
            <MealAddStatusBanner label={t("text_analyzing_status")} />
          }
          footerNote={t("text_analyzing_footer")}
        />
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
    fill: {
      flex: 1,
      backgroundColor: theme.surface,
    },
    preview: {
      flex: 1,
      backgroundColor: theme.backgroundSecondary,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 24,
    },
    previewNameField: {
      marginBottom: 24,
    },
    previewDescriptionField: {
      flex: 1,
    },
  });
