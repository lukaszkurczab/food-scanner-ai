import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  SectionList,
  RefreshControl,
  Text,
  ViewToken,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";
import { FilterBadgeButton } from "../components/FilterBadgeButton";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { FilterPanel } from "../components/FilterPanel";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNetInfo } from "@react-native-community/netinfo";
import { Layout } from "@/components";
import { getMealsPage } from "@services/mealService";
import { MealListItem } from "../../../components/MealListItem";
import { SearchBox } from "@/components/SearchBox";
import { useTranslation } from "react-i18next";

const PAGE_SIZE = 20;

type DaySection = {
  title: string;
  dateKey: string;
  totalKcal: number;
  data: Meal[];
};

const toDate = (val?: string | number | null): Date | null => {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
};

const getMealDate = (m: Meal): Date => {
  return (
    toDate(m.timestamp) ||
    toDate(m.updatedAt) ||
    toDate(m.createdAt) ||
    new Date(0)
  );
};

const fmtDateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const fmtHeader = (d: Date, t: (key: string) => string) => {
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) return t("common:today");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
};

const mealKcal = (meal: Meal) =>
  meal.ingredients?.reduce((sum, ing) => sum + (ing.kcal || 0), 0) || 0;

const norm = (s: any) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export default function HistoryListScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const netInfo = useNetInfo();
  const { uid } = useAuthContext();
  const { duplicateMeal, deleteMeal, getMeals } = useMeals(uid || "");
  const { t } = useTranslation(["meals", "common"]);

  const [filterCount, setFilterCount] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [items, setItems] = useState<Meal[]>([]);
  const [cursorBefore, setCursorBefore] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  const loadingMoreRef = useRef(false);
  const lastCursorRef = useRef<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setHasMore(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const page = await getMealsPage(uid, { limit: PAGE_SIZE, before: null });
    setItems(page.items);
    setCursorBefore(page.nextBefore);
    lastCursorRef.current = page.nextBefore;
    setHasMore(page.items.length === PAGE_SIZE && !!page.nextBefore);
    setLoading(false);
  }, [uid]);

  const loadMore = useCallback(async () => {
    if (!uid || !hasMore || loadingMoreRef.current || !cursorBefore) return;
    if (cursorBefore === lastCursorRef.current && items.length > 0) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    const page = await getMealsPage(uid, {
      limit: PAGE_SIZE,
      before: cursorBefore,
    });
    const merged = new Map<string, Meal>();
    for (const it of items) merged.set(String(it.cloudId || it.mealId), it);
    for (const it of page.items)
      merged.set(String(it.cloudId || it.mealId), it);
    const next = Array.from(merged.values());
    setItems(next);
    setCursorBefore(page.nextBefore);
    setHasMore(
      page.items.length === PAGE_SIZE &&
        !!page.nextBefore &&
        page.nextBefore !== lastCursorRef.current
    );
    lastCursorRef.current = page.nextBefore;
    setLoadingMore(false);
    setTimeout(() => {
      loadingMoreRef.current = false;
    }, 50);
  }, [uid, hasMore, cursorBefore, items]);

  useEffect(() => {
    loadFirstPage();
  }, [loadFirstPage]);

  const refresh = useCallback(async () => {
    await getMeals();
    await loadFirstPage();
  }, [getMeals, loadFirstPage]);

  const idToIndex = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((m, i) => {
      const id = String(m.cloudId || (m as any).mealId || "");
      if (id) map.set(id, i);
    });
    return map;
  }, [items]);

  const visibleItems: Meal[] = useMemo(() => {
    const q = norm(query);
    const base = [...items].sort((a, b) => +getMealDate(b) - +getMealDate(a));
    if (!q) return base;
    return base.filter((m) => {
      const title =
        norm((m as any).title) ||
        norm((m as any).name) ||
        norm((m as any).mealName);
      const ing = norm(
        (m.ingredients || [])
          .map((x: any) => x?.name || x?.title || "")
          .join(" ")
      );
      return title.includes(q) || ing.includes(q);
    });
  }, [items, query]);

  const sections: DaySection[] = useMemo(() => {
    if (!visibleItems.length) return [];
    const byKey = new Map<string, DaySection>();
    const keysInOrder: string[] = [];
    for (const meal of visibleItems) {
      const d = getMealDate(meal);
      const key = fmtDateKey(d);
      if (!byKey.has(key)) {
        byKey.set(key, {
          title: fmtHeader(d, t),
          dateKey: key,
          totalKcal: 0,
          data: [],
        });
        keysInOrder.push(key);
      }
      const sec = byKey.get(key)!;
      sec.data.push(meal);
      sec.totalKcal += mealKcal(meal);
    }
    return keysInOrder.map((k) => {
      const s = byKey.get(k)!;
      return { ...s, totalKcal: Math.round(s.totalKcal) };
    });
  }, [visibleItems, t]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<ViewToken> }) => {
      if (loadingMoreRef.current || !hasMore) return;
      let maxDataIndex = -1;
      for (const v of viewableItems) {
        const item: any = v.item;
        if (!item) continue;
        const id = String(item.cloudId || item.mealId || "");
        const idx = id ? idToIndex.get(id) ?? -1 : -1;
        if (idx > maxDataIndex) maxDataIndex = idx;
      }
      if (maxDataIndex < 0) return;
      const remaining = items.length - (maxDataIndex + 1);
      if (remaining <= 10) loadMore();
    }
  );

  const onEditMeal = (_mealId: string) => {};
  const onDuplicateMeal = (meal: Meal) => duplicateMeal(meal);
  const onDeleteMeal = (mealCloudId?: string) => {
    if (mealCloudId) deleteMeal(mealCloudId);
  };

  if (loading) return <LoadingSkeleton />;

  if (!sections.length) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background }}>
        {!netInfo.isConnected && <OfflineBanner />}
        {showFilters ? (
          <FilterPanel
            onApply={(filters) => {
              setFilterCount(
                Object.values(filters || {}).filter(Boolean).length
              );
              setShowFilters(false);
            }}
            onClear={() => {
              setFilterCount(0);
              setShowFilters(false);
            }}
          />
        ) : (
          <>
            <View style={{ padding: theme.spacing.md }}>
              <SearchBox value={query} onChange={setQuery} />
            </View>
            <EmptyState
              title={t("meals:noMealsFound")}
              description={
                query
                  ? t("meals:tryDifferentSearch")
                  : t("meals:tryChangeFilters")
              }
            />
          </>
        )}
      </View>
    );
  }

  const SectionHeader = ({
    title,
    total,
  }: {
    title: string;
    total: number;
  }) => (
    <View
      style={{
        paddingHorizontal: theme.spacing.md,
        paddingTop: theme.spacing.sm,
        paddingBottom: theme.spacing.sm,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "baseline",
        backgroundColor: theme.background,
      }}
    >
      <Text
        style={{
          color: theme.text,
          fontSize: theme.typography.size.lg,
          fontWeight: "600",
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: theme.textSecondary,
          fontSize: theme.typography.size.md,
          fontWeight: "400",
        }}
      >
        {total} {t("common:kcal")}
      </Text>
    </View>
  );

  return (
    <Layout>
      {!netInfo.isConnected && <OfflineBanner />}
      {showFilters ? (
        <FilterPanel
          onApply={(filters) => {
            setFilterCount(Object.values(filters || {}).filter(Boolean).length);
            setShowFilters(false);
          }}
          onClear={() => {
            setFilterCount(0);
            setShowFilters(false);
          }}
        />
      ) : (
        <>
          <View style={{ padding: theme.spacing.md }}>
            <SearchBox value={query} onChange={setQuery} />
          </View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              paddingHorizontal: theme.spacing.md,
            }}
          >
            <FilterBadgeButton
              activeCount={filterCount}
              onPress={() => setShowFilters(!showFilters)}
            />
          </View>

          <SectionList
            sections={sections}
            keyExtractor={(item) => item.cloudId || (item as any).mealId}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={refresh} />
            }
            renderSectionHeader={({ section }) => (
              <SectionHeader title={section.title} total={section.totalKcal} />
            )}
            renderItem={({ item }) => (
              <View
                style={{
                  paddingHorizontal: theme.spacing.md,
                  marginBottom: theme.spacing.sm,
                }}
              >
                <MealListItem
                  meal={item}
                  onPress={() =>
                    navigation.navigate("MealDetails", { meal: item })
                  }
                  onEdit={() =>
                    onEditMeal((item as any).cloudId || (item as any).mealId)
                  }
                  onDuplicate={() => onDuplicateMeal(item)}
                  onDelete={() => onDeleteMeal((item as any).cloudId)}
                />
              </View>
            )}
            contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={{ itemVisiblePercentThreshold: 10 }}
            ListFooterComponent={
              loadingMore ? <LoadingSkeleton height={56} /> : null
            }
            stickySectionHeadersEnabled
            removeClippedSubviews
            windowSize={7}
            initialNumToRender={PAGE_SIZE}
          />
        </>
      )}
    </Layout>
  );
}
