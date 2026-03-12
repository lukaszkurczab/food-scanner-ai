import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BackHandler } from "react-native";
import * as FileSystem from "expo-file-system";
import { calculateTotalNutrients } from "@/utils/calculateTotalNutrients";
import type { Meal, MealType, Ingredient } from "@/types/meal";
import type { RootStackParamList } from "@/navigation/navigate";
import type { StackNavigationProp } from "@react-navigation/stack";
import { on } from "@/services/core/events";
import { getMealByCloudIdLocal } from "@/services/offline/meals.repo";
import { getMyMealByCloudIdLocal } from "@/services/offline/myMeals.repo";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function normalizeForCompare(meal: Meal) {
  return {
    ...meal,
    updatedAt: "",
    localPhotoUrl: undefined,
    photoLocalPath: undefined,
  };
}

function toEpochMs(value?: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function pickLatestMeal(candidates: Array<Meal | null>): Meal | null {
  let latest: Meal | null = null;
  let latestTs = 0;
  for (const candidate of candidates) {
    if (!candidate) continue;
    const ts = toEpochMs(candidate.updatedAt);
    if (!latest || ts >= latestTs) {
      latest = candidate;
      latestTs = ts;
    }
  }
  return latest;
}

export function useMealDetailsState(params: {
  routeParams: RootStackParamList["MealDetails"];
  navigation: StackNavigationProp<RootStackParamList>;
  updateMeal: (meal: Meal) => Promise<unknown>;
}) {
  const { routeParams, navigation, updateMeal } = params;
  const initialMeal = routeParams.meal;
  const forceEdit = !!routeParams.edit;
  const baselineFromRoute = routeParams.baseline;
  const routeMealId = initialMeal?.cloudId ?? initialMeal?.mealId ?? null;

  const [draft, setDraft] = useState<Meal | null>(() => initialMeal ?? null);
  const [saving, setSaving] = useState(false);
  const [edit, setEdit] = useState<boolean>(() => forceEdit);
  const [editBaseline, setEditBaseline] = useState<Meal | null>(() => {
    if (baselineFromRoute) return clone(baselineFromRoute);
    if (forceEdit && initialMeal) return clone(initialMeal);
    return null;
  });
  const [showIngredients, setShowIngredients] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [checkingImage, setCheckingImage] = useState(false);
  const allowNextBackRef = useRef(false);

  useEffect(() => {
    if (!routeMealId) return;
    const currentId = draft?.cloudId ?? draft?.mealId ?? null;
    if (currentId !== routeMealId) {
      setDraft(initialMeal ?? null);
      if (forceEdit && initialMeal) {
        setEdit(true);
        setEditBaseline(clone(initialMeal));
      }
    }
  }, [draft?.cloudId, draft?.mealId, forceEdit, initialMeal, routeMealId]);

  const reloadFromLocal = useCallback(async () => {
    if (!routeMealId) return false;
    const userUid =
      (typeof draft?.userUid === "string" && draft.userUid) ||
      (typeof initialMeal?.userUid === "string" && initialMeal.userUid) ||
      "";
    if (!userUid) return false;

    const [historyMeal, savedMeal] = await Promise.all([
      getMealByCloudIdLocal(userUid, routeMealId),
      getMyMealByCloudIdLocal(userUid, routeMealId),
    ]);
    const latest = pickLatestMeal([historyMeal, savedMeal]);
    if (!latest) return false;

    setDraft((current) => {
      if (!current) return latest;
      if (edit) {
        if (
          current.syncState === latest.syncState &&
          (current.lastSyncedAt ?? 0) === (latest.lastSyncedAt ?? 0)
        ) {
          return current;
        }
        return {
          ...current,
          syncState: latest.syncState,
          lastSyncedAt: latest.lastSyncedAt ?? current.lastSyncedAt ?? null,
        };
      }
      return {
        ...latest,
        localPhotoUrl:
          current.localPhotoUrl ??
          latest.localPhotoUrl ??
          latest.photoLocalPath ??
          latest.photoUrl ??
          null,
      };
    });
    return true;
  }, [draft?.userUid, edit, initialMeal?.userUid, routeMealId]);

  useEffect(() => {
    if (!routeMealId) return;
    const userUid =
      (typeof draft?.userUid === "string" && draft.userUid) ||
      (typeof initialMeal?.userUid === "string" && initialMeal.userUid) ||
      "";
    if (!userUid) return;

    let cancelled = false;
    void reloadFromLocal();

    const handleSyncEvent = (event?: { cloudId?: string }) => {
      const cloudId = typeof event?.cloudId === "string" ? event.cloudId : "";
      if (!cloudId || cloudId !== routeMealId) return;
      if (cancelled) return;
      void reloadFromLocal();
    };

    const unsubs = [
      on<{ cloudId?: string }>("meal:local:upserted", handleSyncEvent),
      on<{ cloudId?: string }>("mymeal:local:upserted", handleSyncEvent),
    ];

    return () => {
      cancelled = true;
      for (const unsub of unsubs) {
        unsub();
      }
    };
  }, [draft?.userUid, initialMeal?.userUid, reloadFromLocal, routeMealId]);

  useEffect(() => {
    const localFromParams = routeParams.localPhotoUrl ?? undefined;
    if (!localFromParams) return;

    setDraft((current) =>
      current
        ? {
            ...current,
            localPhotoUrl: localFromParams,
            photoLocalPath: localFromParams,
            photoUrl: localFromParams,
          }
        : current,
    );

    navigation.setParams({
      localPhotoUrl: undefined,
    } as Partial<RootStackParamList["MealDetails"]>);
  }, [navigation, routeParams.localPhotoUrl]);

  const isDirty = useMemo(() => {
    if (!edit || !editBaseline || !draft) return false;
    const current = normalizeForCompare(draft);
    const baseline = normalizeForCompare(editBaseline);
    return JSON.stringify(current) !== JSON.stringify(baseline);
  }, [draft, edit, editBaseline]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (edit && isDirty) {
        setShowLeaveModal(true);
        return true;
      }
      if (navigation.canGoBack()) {
        allowNextBackRef.current = true;
        navigation.goBack();
      } else {
        navigation.navigate("SavedMeals");
      }
      return true;
    });
    return () => sub.remove();
  }, [edit, isDirty, navigation]);

  useEffect(() => {
    const sub = navigation.addListener("beforeRemove", (e) => {
      if (allowNextBackRef.current) {
        allowNextBackRef.current = false;
        return;
      }

      const actionType = e.data.action.type;
      const isBackAction =
        actionType === "GO_BACK" ||
        actionType === "POP" ||
        actionType === "POP_TO_TOP";

      if (!isBackAction) return;
      if (!edit || !isDirty) return;

      e.preventDefault();
      setShowLeaveModal(true);
    });

    return sub;
  }, [edit, isDirty, navigation]);

  const effectivePhotoUri =
    draft?.localPhotoUrl || draft?.photoLocalPath || draft?.photoUrl || "";

  useEffect(() => {
    const url = effectivePhotoUri;
    if (!url) return;
    const isLocal =
      typeof url === "string" &&
      (url.startsWith("file://") || url.startsWith("content://"));
    if (!isLocal) return;

    let cancelled = false;
    setCheckingImage(true);
    FileSystem.getInfoAsync(url)
      .then((info) => {
        if (cancelled) return;
        if (!info.exists) {
          setDraft((current) =>
            current
              ? {
                  ...current,
                  localPhotoUrl: null,
                  photoLocalPath: null,
                  photoUrl: "",
                }
              : current,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setCheckingImage(false);
      });

    return () => {
      cancelled = true;
    };
  }, [effectivePhotoUri]);

  const nutrition = useMemo(
    () => (draft ? calculateTotalNutrients([draft]) : null),
    [draft],
  );

  const setName = useCallback((value: string) => {
    setDraft((current) => (current ? { ...current, name: value } : current));
  }, []);

  const setType = useCallback((value: MealType) => {
    setDraft((current) => (current ? { ...current, type: value } : current));
  }, []);

  const updateIngredientAt = useCallback((index: number, ingredient: Ingredient) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            ingredients: current.ingredients.map((item, i) =>
              i === index ? ingredient : item,
            ),
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }, []);

  const removeIngredientAt = useCallback((index: number) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            ingredients: current.ingredients.filter((_, i) => i !== index),
            updatedAt: new Date().toISOString(),
          }
        : current,
    );
  }, []);

  const startEdit = useCallback(() => {
    if (!draft) return;
    setEditBaseline(clone(draft));
    setEdit(true);
  }, [draft]);

  const handleSave = useCallback(async () => {
    if (!draft || saving) return;
    setSaving(true);
    const next: Meal = { ...draft, updatedAt: new Date().toISOString() };
    const toPersist: Meal = { ...next, localPhotoUrl: undefined };
    try {
      await updateMeal(toPersist);
      setEdit(false);
      setEditBaseline(null);
      setDraft(next);
    } finally {
      setSaving(false);
    }
  }, [draft, saving, updateMeal]);

  const handleCancel = useCallback(() => {
    if (edit && isDirty) {
      setShowDiscardModal(true);
      return;
    }
    if (editBaseline) setDraft(editBaseline);
    setEdit(false);
    setEditBaseline(null);
  }, [edit, editBaseline, isDirty]);

  const confirmDiscard = useCallback(() => {
    if (editBaseline) setDraft(editBaseline);
    setShowDiscardModal(false);
    setEdit(false);
    setEditBaseline(null);
  }, [editBaseline]);

  const confirmLeave = useCallback(() => {
    setShowLeaveModal(false);
    if (navigation.canGoBack()) {
      allowNextBackRef.current = true;
      navigation.goBack();
    } else {
      navigation.navigate("SavedMeals");
    }
  }, [navigation]);

  const goShare = useCallback(() => {
    if (!draft) return;
    navigation.navigate("MealShare", { meal: draft, returnTo: "MealDetails" });
  }, [draft, navigation]);

  const handleAddPhoto = useCallback(() => {
    if (!draft) return;
    navigation.replace("SavedMealsCamera", { id: draft.mealId, meal: draft });
  }, [draft, navigation]);

  const onImageError = useCallback(() => {
    setDraft((current) =>
      current
        ? {
            ...current,
            localPhotoUrl: null,
            photoLocalPath: null,
            photoUrl: "",
          }
        : current,
    );
  }, []);

  const toggleIngredients = useCallback(() => {
    if (saving) return;
    setShowIngredients((prev) => !prev);
  }, [saving]);

  const closeDiscardModal = useCallback(() => {
    setShowDiscardModal(false);
  }, []);

  const closeLeaveModal = useCallback(() => {
    setShowLeaveModal(false);
  }, []);

  const handleBack = useCallback(() => {
    if (edit && isDirty) {
      setShowLeaveModal(true);
      return;
    }

    if (navigation.canGoBack()) {
      allowNextBackRef.current = true;
      navigation.goBack();
    } else {
      navigation.navigate("SavedMeals");
    }
  }, [edit, isDirty, navigation]);

  const showImageBlock =
    checkingImage || !!effectivePhotoUri || (edit && !effectivePhotoUri);

  return {
    draft,
    saving,
    edit,
    isDirty,
    showIngredients,
    showDiscardModal,
    showLeaveModal,
    checkingImage,
    effectivePhotoUri,
    showImageBlock,
    nutrition,
    setName,
    setType,
    updateIngredientAt,
    removeIngredientAt,
    startEdit,
    handleSave,
    handleCancel,
    confirmDiscard,
    confirmLeave,
    goShare,
    handleAddPhoto,
    onImageError,
    toggleIngredients,
    closeDiscardModal,
    closeLeaveModal,
    handleBack,
    reloadFromLocal,
  };
}
