import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ViewToken,
  Text,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNetInfo } from "@react-native-community/netinfo";
import {
  BottomTabBar,
  FullScreenLoader,
  Layout,
  SearchBox,
  UserIcon,
} from "@/components";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { FilterPanel } from "../components/FilterPanel";
import { MealListItem } from "@/components/MealListItem";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  query as fsQuery,
  orderBy,
  onSnapshot,
  limit,
  startAfter,
  getDocs,
  deleteDoc,
  doc,
} from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";
import { useFilters } from "@/context/HistoryContext";
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { v4 as uuidv4 } from "uuid";

const PAGE_SIZE = 20;

const norm = (s: any) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const app = getApp();
const db = getFirestore(app);

const toNumber = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const mealTotals = (m: Meal) => {
  const ing = m.ingredients || [];
  const sum = <K extends "kcal" | "protein" | "carbs" | "fat">(k: K) =>
    ing.reduce((a, b) => a + toNumber((b as any)?.[k]), 0);
  return {
    kcal: sum("kcal"),
    protein: sum("protein"),
    carbs: sum("carbs"),
    fat: sum("fat"),
  };
};

const toDate = (val?: string | number | null): Date | null => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const getMealDate = (m: Meal): Date | null => {
  return (
    toDate((m as any).timestamp) ||
    toDate((m as any).updatedAt) ||
    toDate((m as any).createdAt) ||
    null
  );
};

export default function SavedMealsScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const netInfo = useNetInfo();
  const { uid } = useAuthContext();
  const { duplicateMeal, getMeals } = useMeals(uid || "");
  const { t } = useTranslation(["meals", "common"]);
  const {
    meal: draftMeal,
    setMeal,
    saveDraft,
    setLastScreen,
  } = useMealDraftContext();

  const {
    query,
    setQuery,
    filters,
    showFilters,
    toggleShowFilters,
    filterCount,
  } = useFilters("myMeals");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Meal[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadingMoreRef = useRef(false);

  const subscribeFirstPage = useCallback(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return () => {};
    }
    const q = fsQuery(
      collection(db, "users", uid, "myMeals"),
      orderBy("name", "asc"),
      limit(PAGE_SIZE)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d: any) => ({
        ...(d.data() as Meal),
        cloudId: d.id,
      }));
      setItems(data);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      setLoading(false);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    const unsub = subscribeFirstPage();
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [subscribeFirstPage]);

  const loadMore = useCallback(async () => {
    if (!uid || !hasMore || loadingMoreRef.current || !lastDoc) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const q = fsQuery(
      collection(db, "users", uid, "myMeals"),
      orderBy("name", "asc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
    const snap = await getDocs(q);
    const data = snap.docs.map((d: any) => ({
      ...(d.data() as Meal),
      cloudId: d.id,
    }));
    setItems((prev) => [...prev, ...data]);
    setLastDoc(snap.docs[snap.docs.length - 1] || null);
    setHasMore(snap.docs.length === PAGE_SIZE);
    setLoadingMore(false);
    setTimeout(() => {
      loadingMoreRef.current = false;
    }, 50);
  }, [uid, hasMore, lastDoc]);

  const refresh = useCallback(async () => {
    await getMeals();
  }, [getMeals]);

  const visibleItems = useMemo(() => {
    const q = norm(query);
    const base = [...items].sort((a, b) => {
      const an = norm(a.name || "");
      const bn = norm(b.name || "");
      if (an && bn) return an.localeCompare(bn);
      if (an && !bn) return -1;
      if (!an && bn) return 1;
      return 0;
    });

    const byText = !q
      ? base
      : base.filter((m) => {
          const title = norm(m.name) || "";
          const ing = norm(
            (m.ingredients || []).map((x: any) => x?.name || "").join(" ")
          );
          return title.includes(q) || ing.includes(q);
        });

    if (!filters) return byText;

    return byText.filter((m) => {
      const totals = mealTotals(m);

      if (filters.calories) {
        const [min, max] = filters.calories;
        if (totals.kcal < min || totals.kcal > max) return false;
      }
      if (filters.protein) {
        const [min, max] = filters.protein;
        if (totals.protein < min || totals.protein > max) return false;
      }
      if (filters.carbs) {
        const [min, max] = filters.carbs;
        if (totals.carbs < min || totals.carbs > max) return false;
      }
      if (filters.fat) {
        const [min, max] = filters.fat;
        if (totals.fat < min || totals.fat > max) return false;
      }
      if (filters.dateRange) {
        const d = getMealDate(m);
        if (d) {
          const s = new Date(filters.dateRange.start);
          const e = new Date(filters.dateRange.end);
          s.setHours(0, 0, 0, 0);
          e.setHours(23, 59, 59, 999);
          if (+d < +s || +d > +e) return false;
        }
      }
      return true;
    });
  }, [items, query, filters]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (loadingMoreRef.current || !hasMore || !lastDoc) return;
      const globalMax = viewableItems.reduce((max, v) => {
        const idx = typeof v.index === "number" ? v.index : -1;
        return idx > max ? idx : max;
      }, -1);
      const remaining = visibleItems.length - (globalMax + 1);
      if (remaining <= 10) loadMore();
    }
  );

  const buildDraftFromSaved = useCallback(
    (picked: Meal): Meal => {
      const now = new Date().toISOString();
      const base: Meal =
        draftMeal ??
        ({
          mealId: uuidv4(),
          userUid: uid!,
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
      return {
        ...base,
        mealId: uuidv4(),
        source: "saved",
        ingredients: Array.isArray(picked.ingredients)
          ? picked.ingredients
          : [],
        photoUrl: picked.photoUrl ?? null,
        updatedAt: now,
        name: picked.name ?? "",
      };
    },
    [draftMeal, uid]
  );

  const onDuplicate = useCallback(
    async (m: Meal) => {
      if (!uid) return;
      const next = buildDraftFromSaved(m);
      setMeal(next);
      await saveDraft(uid);
      await setLastScreen(uid, "ReviewIngredients");
      navigation.navigate("ReviewIngredients");
    },
    [uid, buildDraftFromSaved, setMeal, saveDraft, setLastScreen, navigation]
  );

  const onEdit = useCallback(
    async (m: Meal) => {
      if (!uid) return;
      const next = buildDraftFromSaved(m);
      setMeal(next);
      await saveDraft(uid);
      await setLastScreen(uid, "EditReviewIngredients");
      navigation.navigate("EditReviewIngredients", {
        mode: "edit-saved",
        savedCloudId: m.cloudId,
      });
    },
    [uid, buildDraftFromSaved, setMeal, saveDraft, setLastScreen, navigation]
  );

  const onDelete = useCallback(
    async (m: Meal) => {
      if (!uid || !m.cloudId) return;
      await deleteDoc(doc(db, "users", uid, "myMeals", m.cloudId));
    },
    [uid]
  );

  const onDuplicateMeal = (meal: Meal) => duplicateMeal(meal);

  if (loading)
    return (
      <Layout disableScroll>
        <FullScreenLoader />
      </Layout>
    );

  if (!visibleItems.length) {
    return (
      <Layout disableScroll>
        {!netInfo.isConnected && <OfflineBanner />}
        {showFilters ? (
          <FilterPanel scope="myMeals" />
        ) : (
          <>
            <View style={{ padding: theme.spacing.md }}>
              <SearchBox value={query} onChange={setQuery} />
            </View>
            <EmptyState
              title={t("meals:noSavedMeals", "No saved meals")}
              description={
                query
                  ? t("meals:tryDifferentSearch", "Try a different search.")
                  : t(
                      "meals:saveMealsToReuse",
                      "Save meals to reuse them later."
                    )
              }
            />
          </>
        )}
      </Layout>
    );
  }

  return (
    <Layout disableScroll>
      {!netInfo.isConnected && <OfflineBanner />}
      {showFilters ? (
        <View style={[styles.fill, { paddingBottom: theme.spacing.nav }]}>
          <FilterPanel scope="myMeals" />
        </View>
      ) : (
        <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
          <View style={styles.row}>
            <SearchBox value={query} onChange={setQuery} />
            <FilterBadgeButton
              activeCount={filterCount}
              onPress={toggleShowFilters}
            />
          </View>
        </View>
      )}
      {!showFilters && (
        <FlatList
          data={visibleItems}
          keyExtractor={(item) => (item as any).cloudId || (item as any).mealId}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} />
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.listItemWrap,
                {
                  paddingHorizontal: theme.spacing.md,
                  marginBottom: theme.spacing.sm,
                },
              ]}
            >
              <MealListItem
                meal={item}
                onPress={() =>
                  navigation.navigate("MealDetails", { meal: item })
                }
                onDuplicate={() => onDuplicate(item)}
                onEdit={() => onEdit(item)}
                onDelete={() => onDelete(item)}
              />
            </View>
          )}
          contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
          onViewableItemsChanged={onViewableItemsChanged.current}
          viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
          ListFooterComponent={
            loadingMore ? <LoadingSkeleton height={56} /> : null
          }
          removeClippedSubviews
          windowSize={7}
          initialNumToRender={PAGE_SIZE}
        />
      )}
      <BottomTabBar />
    </Layout>
  );
}

const styles = StyleSheet.create({
  fill: { height: "100%" },
  row: { flexDirection: "row", gap: 8 },
  listItemWrap: {},
});
