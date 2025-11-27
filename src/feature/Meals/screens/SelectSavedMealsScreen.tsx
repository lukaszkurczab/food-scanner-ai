import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, FlatList, RefreshControl, ViewToken } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";
import { EmptyState } from "../components/EmptyState";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  FullScreenLoader,
  Layout,
  PrimaryButton,
  SecondaryButton,
} from "@/components";
import { SearchBox } from "@/components/SearchBox";
import { MealListItem } from "@/components/MealListItem";
import { useMealDraftContext } from "@contexts/MealDraftContext";

import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";
import { cacheKeys, getJSON, setJSON } from "@/services/cache";

const STEP = 20;
const TAIL_THRESHOLD = 10;

const norm = (s: any) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const app = getApp();
const db = getFirestore(app);

export default function SelectSavedMealScreen({
  navigation,
}: {
  navigation: any;
}) {
  const theme = useTheme();
  const netInfo = useNetInfo();
  const { uid } = useAuthContext();
  const { getMeals } = useMeals(uid ?? null);
  const {
    meal: draftMeal,
    setMeal,
    saveDraft,
    setLastScreen,
  } = useMealDraftContext();
  const { t } = useTranslation(["meals"]);

  const [queryText, setQueryText] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Meal[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [limit, setLimit] = useState(STEP);
  const loadingMoreRef = useRef(false);

  const subscribe = useCallback(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return () => {};
    }
    // hydrate from cache first
    (async () => {
      const cached = await getJSON<Meal[]>(cacheKeys.myMealsList(uid));
      if (cached) {
        setItems(cached);
        setLoading(false);
      }
    })();
    const q = query(
      collection(db, "users", uid, "myMeals"),
      orderBy("name", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d: any) => ({
        ...(d.data() as Meal),
        cloudId: d.id,
      }));
      setItems(data);
      setLoading(false);
      setLimit(STEP);
      // persist to cache per user
      if (uid) void setJSON(cacheKeys.myMealsList(uid), data);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    const unsub = subscribe();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [subscribe]);

  const refresh = useCallback(async () => {
    await getMeals();
  }, [getMeals]);

  const visibleAll = useMemo(() => {
    const q = norm(queryText);
    const base = [...items].sort((a, b) => {
      const an = norm(a.name || "");
      const bn = norm(b.name || "");
      if (an && bn) return an.localeCompare(bn);
      if (an && !bn) return -1;
      if (!an && bn) return 1;
      return 0;
    });
    if (!q) return base;
    return base.filter((m) => {
      const title = norm(m.name) || "";
      const ing = norm(
        (m.ingredients || []).map((x: any) => x?.name || "").join(" ")
      );
      return title.includes(q) || ing.includes(q);
    });
  }, [items, queryText]);

  useEffect(() => {
    setLimit(STEP);
  }, [queryText]);

  const pageItems = useMemo(
    () => visibleAll.slice(0, Math.min(limit, visibleAll.length)),
    [visibleAll, limit]
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (loadingMoreRef.current) return;
      if (pageItems.length >= visibleAll.length) return;

      const triggerIndex = Math.max(0, limit - TAIL_THRESHOLD);
      const reached = viewableItems.some((v) => {
        const idx = typeof v.index === "number" ? v.index : -1;
        return idx >= triggerIndex;
      });

      if (reached) {
        loadingMoreRef.current = true;
        const newLimit = Math.min(limit + STEP, visibleAll.length);
        setLimit(newLimit);
        setTimeout(() => {
          loadingMoreRef.current = false;
        }, 50);
      }
    }
  );

  const handleSelect = useCallback((meal: Meal) => {
    setSelectedId((prev) =>
      prev === (meal.cloudId || meal.mealId)
        ? null
        : ((meal.cloudId || meal.mealId) as string)
    );
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!uid || !selectedId) return;
    const picked = pageItems.find(
      (m) => (m.cloudId || m.mealId) === selectedId
    );
    if (!picked) return;

    const now = new Date().toISOString();

    const base: Meal =
      draftMeal ??
      ({
        mealId: uuidv4(),
        userUid: uid,
        name: "",
        photoUrl: null,
        ingredients: [],
        createdAt: now,
        updatedAt: now,
        syncState: "pending",
        tags: [],
        deleted: false,
        notes: null,
        type: "other",
        timestamp: "",
        source: null,
        cloudId: undefined,
      } as any);

    const next: Meal = {
      ...base,
      // ensure we keep reference to saved meal for potential update
      mealId: picked.mealId || base.mealId,
      source: "saved",
      ingredients: Array.isArray(picked.ingredients) ? picked.ingredients : [],
      photoUrl: picked.photoUrl ?? null,
      updatedAt: now,
      name: picked.name ?? "",
    };

    setMeal(next);
    await saveDraft(uid);
    await setLastScreen(uid, "ReviewIngredients");
    navigation.navigate("ReviewIngredients");
  }, [
    uid,
    selectedId,
    pageItems,
    draftMeal,
    setMeal,
    saveDraft,
    setLastScreen,
    navigation,
  ]);

  const handleStartOver = useCallback(() => {
    navigation.replace("MealAddMethod");
  }, [navigation]);

  if (loading)
    return (
      <Layout disableScroll>
        <FullScreenLoader />
      </Layout>
    );

  if (!pageItems.length) {
    return (
      <Layout>
        {!netInfo.isConnected && <OfflineBanner />}
        <View style={{ padding: theme.spacing.md }}>
          <SearchBox value={queryText} onChange={setQueryText} />
        </View>
        <EmptyState
          title={t("meals:noSavedMeals", "No saved meals")}
          description={
            queryText
              ? t("meals:tryDifferentSearch", "Try a different search.")
              : t("meals:saveMealsToReuse", "Save meals to reuse them later.")
          }
        />
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          <PrimaryButton label={t("meals:select", "Select")} disabled />
          <SecondaryButton
            label={t("meals:select_method", "Start over")}
            onPress={handleStartOver}
          />
        </View>
      </Layout>
    );
  }

  return (
    <Layout disableScroll>
      {!netInfo.isConnected && <OfflineBanner />}
      <View style={{ padding: theme.spacing.md }}>
        <SearchBox value={queryText} onChange={setQueryText} />
      </View>
      <FlatList
        data={pageItems}
        keyExtractor={(item) => (item.cloudId || item.mealId) as string}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        renderItem={({ item }) => {
          const id = (item.cloudId || item.mealId) as string;
          const selected = selectedId === id;
          return (
            <View
              style={{
                paddingHorizontal: theme.spacing.md,
                marginBottom: theme.spacing.sm,
              }}
            >
              <MealListItem
                meal={item}
                onPress={() => handleSelect(item)}
                onSelect={() => handleSelect(item)}
                selected={selected}
                onDuplicate={() => {}}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            </View>
          );
        }}
        contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
        removeClippedSubviews
        initialNumToRender={STEP}
        windowSize={7}
      />
      <View
        style={{
          paddingHorizontal: theme.spacing.lg,
          paddingBottom: theme.spacing.lg,
          gap: theme.spacing.md,
        }}
      >
        <PrimaryButton
          label={t("meals:select", "Select")}
          onPress={handleConfirm}
          disabled={!selectedId}
        />
        <SecondaryButton
          label={t("meals:select_method", "Start over")}
          onPress={handleStartOver}
        />
      </View>
    </Layout>
  );
}
