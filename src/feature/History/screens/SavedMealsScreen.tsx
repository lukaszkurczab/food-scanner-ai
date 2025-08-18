import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, FlatList, RefreshControl } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useAuthContext } from "@/context/AuthContext";
import { useMeals } from "@hooks/useMeals";
import type { Meal } from "@/types/meal";
import { EmptyState } from "../components/EmptyState";
import { LoadingSkeleton } from "../components/LoadingSkeleton";
import { OfflineBanner } from "@/components/OfflineBanner";
import { useNetInfo } from "@react-native-community/netinfo";
import { Layout } from "@/components";
import { SearchBox } from "@/components/SearchBox";
import { MealListItem } from "@/components/MealListItem";
import { getApp } from "@react-native-firebase/app";
import {
  getFirestore,
  collection,
  query as fsQuery,
  orderBy,
  onSnapshot,
} from "@react-native-firebase/firestore";
import { useTranslation } from "react-i18next";

const norm = (s: any) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const app = getApp();
const db = getFirestore(app);

export default function SavedMealsScreen({ navigation }: { navigation: any }) {
  const theme = useTheme();
  const netInfo = useNetInfo();
  const { uid } = useAuthContext();
  const { duplicateMeal, getMeals } = useMeals(uid || "");
  const { t } = useTranslation(["meals"]);

  const [queryText, setQueryText] = useState("");
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Meal[]>([]);

  const subscribe = useCallback(() => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return () => {};
    }
    const q = fsQuery(
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

  const visibleItems = useMemo(() => {
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

  const onDuplicateMeal = (meal: Meal) => duplicateMeal(meal);

  if (loading) return <LoadingSkeleton />;

  if (!visibleItems.length) {
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
      </Layout>
    );
  }

  return (
    <Layout>
      {!netInfo.isConnected && <OfflineBanner />}
      <View style={{ padding: theme.spacing.md }}>
        <SearchBox value={queryText} onChange={setQueryText} />
      </View>
      <FlatList
        data={visibleItems}
        keyExtractor={(item) => item.cloudId || item.mealId}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        renderItem={({ item }) => (
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              marginBottom: theme.spacing.sm,
            }}
          >
            <MealListItem
              meal={item}
              onPress={() => navigation.navigate("MealDetails", { meal: item })}
              onDuplicate={() => onDuplicateMeal(item)}
              onEdit={() => {}}
              onDelete={() => {}}
            />
          </View>
        )}
        contentContainerStyle={{ paddingBottom: theme.spacing.lg }}
      />
    </Layout>
  );
}
