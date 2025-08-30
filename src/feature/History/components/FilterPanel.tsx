import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  ScrollView,
  Modal,
  Pressable,
  Text,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { RangeSlider } from "@/components";
import { DateRangePicker } from "@/components/DateRangePicker";
import { PrimaryButton, SecondaryButton } from "@/components";
import { Calendar } from "@/components/Calendar";
import { useTranslation } from "react-i18next";
import { Filters, FilterScope, useFilters } from "@/context/HistoryContext";

type Range = { start: Date; end: Date };
type FilterKey = "calories" | "protein" | "carbs" | "fat" | "date";

const DEFAULTS = {
  calories: [0, 3000] as [number, number],
  protein: [0, 100] as [number, number],
  carbs: [0, 100] as [number, number],
  fat: [0, 100] as [number, number],
};

function freeWindowStart(
  today: Date,
  windowDays?: number,
  isPremium?: boolean
) {
  if (!windowDays || isPremium) {
    const x = new Date(today);
    x.setMonth(x.getMonth() - 1);
    return x;
  }
  const c = new Date(today);
  c.setDate(today.getDate() - (windowDays - 1));
  c.setHours(0, 0, 0, 0);
  return c;
}

export const FilterPanel: React.FC<{
  scope: FilterScope;
  isPremium?: boolean;
  windowDays?: number;
  onUpgrade?: () => void;
}> = ({ scope, isPremium = false, windowDays, onUpgrade }) => {
  const theme = useTheme();
  const { t } = useTranslation(["history", "common"]);
  const { filters: ctxFilters, applyFilters, clearFilters } = useFilters(scope);

  const ALL_FILTERS: { key: FilterKey; label: string }[] = useMemo(
    () => [
      { key: "calories", label: t("filters.calories", { ns: "history" }) },
      { key: "protein", label: t("filters.protein", { ns: "history" }) },
      { key: "carbs", label: t("filters.carbs", { ns: "history" }) },
      { key: "fat", label: t("filters.fat", { ns: "history" }) },
      { key: "date", label: t("filters.date", { ns: "history" }) },
    ],
    [t]
  );

  const today = new Date();
  const initialRange: Range = useMemo(() => {
    if (ctxFilters?.dateRange) {
      return {
        start: new Date(ctxFilters.dateRange.start),
        end: new Date(ctxFilters.dateRange.end),
      };
    }
    const start = freeWindowStart(today, windowDays, isPremium);
    return { start, end: today };
  }, [ctxFilters, windowDays, isPremium]);

  const [calories, setCalories] = useState<[number, number]>(
    (ctxFilters?.calories as [number, number]) ?? DEFAULTS.calories
  );
  const [protein, setProtein] = useState<[number, number]>(
    (ctxFilters?.protein as [number, number]) ?? DEFAULTS.protein
  );
  const [carbs, setCarbs] = useState<[number, number]>(
    (ctxFilters?.carbs as [number, number]) ?? DEFAULTS.carbs
  );
  const [fat, setFat] = useState<[number, number]>(
    (ctxFilters?.fat as [number, number]) ?? DEFAULTS.fat
  );
  const [dateRange, setDateRange] = useState<Range>(initialRange);

  const [active, setActive] = useState<FilterKey[]>([]);
  const [openCalendar, setOpenCalendar] = useState(false);
  const [focus, setFocus] = useState<"start" | "end">("start");
  const [localRange, setLocalRange] = useState<Range>(initialRange);
  const [openPicker, setOpenPicker] = useState(false);

  useEffect(() => {
    const nextActive: FilterKey[] = [];
    if (ctxFilters?.calories) nextActive.push("calories");
    if (ctxFilters?.protein) nextActive.push("protein");
    if (ctxFilters?.carbs) nextActive.push("carbs");
    if (ctxFilters?.fat) nextActive.push("fat");
    if (ctxFilters?.dateRange) nextActive.push("date");
    setActive(nextActive);
    setCalories(
      (ctxFilters?.calories as [number, number]) ?? DEFAULTS.calories
    );
    setProtein((ctxFilters?.protein as [number, number]) ?? DEFAULTS.protein);
    setCarbs((ctxFilters?.carbs as [number, number]) ?? DEFAULTS.carbs);
    setFat((ctxFilters?.fat as [number, number]) ?? DEFAULTS.fat);
    if (ctxFilters?.dateRange) {
      const s = new Date(ctxFilters.dateRange.start);
      const e = new Date(ctxFilters.dateRange.end);
      setDateRange({ start: s, end: e });
      setLocalRange({ start: s, end: e });
    } else {
      const s = freeWindowStart(today, windowDays, isPremium);
      setDateRange({ start: s, end: today });
      setLocalRange({ start: s, end: today });
    }
    setFocus("start");
  }, [ctxFilters, windowDays, isPremium]);

  const cutoff = useMemo(() => {
    if (!windowDays || isPremium) return null;
    const now = new Date();
    const c = new Date(now);
    c.setDate(now.getDate() - (windowDays - 1));
    c.setHours(0, 0, 0, 0);
    return c;
  }, [windowDays, isPremium]);

  const isDateBelowWindow = useMemo(() => {
    if (!cutoff) return false;
    return dateRange.start < cutoff || dateRange.end < cutoff;
  }, [dateRange, cutoff]);

  const addOrRemove = (k: FilterKey) =>
    setActive((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
  const removeChip = (k: FilterKey) =>
    setActive((prev) => prev.filter((x) => x !== k));

  const openCalendarModal = () => {
    setLocalRange(dateRange);
    setFocus("start");
    setOpenCalendar(true);
  };
  const applyCalendar = () => {
    const s =
      +localRange.start <= +localRange.end ? localRange.start : localRange.end;
    const e =
      +localRange.start <= +localRange.end ? localRange.end : localRange.start;
    setDateRange({ start: s, end: e });
    setOpenCalendar(false);
  };
  const cancelCalendar = () => {
    setLocalRange(dateRange);
    setFocus("start");
    setOpenCalendar(false);
  };

  const buildPayload = (): Filters => {
    const payload: Filters = {};
    if (active.includes("calories")) payload.calories = calories;
    if (active.includes("protein")) payload.protein = protein;
    if (active.includes("carbs")) payload.carbs = carbs;
    if (active.includes("fat")) payload.fat = fat;
    if (active.includes("date")) payload.dateRange = dateRange;
    return payload;
  };

  const apply = () => {
    const payload = buildPayload();
    applyFilters(payload);
  };

  const clearValues = () => {
    setCalories(DEFAULTS.calories);
    setProtein(DEFAULTS.protein);
    setCarbs(DEFAULTS.carbs);
    setFat(DEFAULTS.fat);
    const now = new Date();
    const s = freeWindowStart(now, windowDays, isPremium);
    setDateRange({ start: s, end: now });
  };

  const clear = () => {
    clearValues();
    setActive([]);
    clearFilters();
  };

  const summaryChips = useMemo(
    () =>
      active.map((k) => {
        const meta = ALL_FILTERS.find((f) => f.key === k)!;
        return (
          <Pressable
            key={k}
            onPress={() => removeChip(k)}
            style={[
              styles.chip,
              {
                backgroundColor: theme.card,
                borderColor: theme.accentSecondary,
                borderRadius: theme.rounded.full,
              },
            ]}
          >
            <Text style={{ color: theme.text }}>{meta.label}</Text>
            <Text style={{ color: theme.accentSecondary, marginLeft: 8 }}>
              ×
            </Text>
          </Pressable>
        );
      }),
    [active, ALL_FILTERS, theme]
  );

  const hasActive = active.length > 0;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        paddingHorizontal: theme.spacing.lg,
      }}
    >
      {!isPremium && cutoff && isDateBelowWindow && (
        <View
          style={{
            marginTop: theme.spacing.md,
            marginBottom: theme.spacing.md,
            padding: theme.spacing.md,
            borderRadius: theme.rounded.lg,
            backgroundColor: theme.overlay,
            borderWidth: 1,
            borderColor: theme.accentSecondary,
          }}
        >
          <Text
            style={{
              color: theme.text,
              fontWeight: "700",
              marginBottom: theme.spacing.xs,
            }}
          >
            Dostęp do danych sprzed 30 dni wymaga Premium
          </Text>
          <Text style={{ color: theme.textSecondary, marginBottom: 8 }}>
            Wybrałeś zakres starszy niż {windowDays ?? 30} dni. Ulepsz do wersji
            Premium, aby wyświetlić starsze wpisy.
          </Text>
          <PrimaryButton label={"Odblokuj Premium"} onPress={onUpgrade} />
        </View>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingVertical: theme.spacing.md,
          gap: theme.spacing.lg,
          paddingBottom: theme.spacing.xl * 3,
        }}
      >
        <View>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: theme.spacing.xl,
              marginBottom: theme.spacing.md,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontWeight: "700",
                fontSize: theme.typography.size.md,
              }}
            >
              Filtry
            </Text>
            <SecondaryButton
              label={"Dodaj filtr"}
              onPress={() => setOpenPicker(true)}
              style={{ paddingVertical: 8, flexShrink: 1 }}
            />
          </View>

          {hasActive ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {summaryChips}
            </View>
          ) : (
            <Text style={{ color: theme.textSecondary }}>
              Brak wybranych filtrów
            </Text>
          )}
        </View>

        {active.includes("calories") && (
          <RangeSlider
            label={"Kalorie"}
            min={0}
            max={2000}
            step={10}
            value={calories}
            onChange={setCalories}
          />
        )}
        {active.includes("protein") && (
          <RangeSlider
            label={"Białko"}
            min={0}
            max={100}
            step={1}
            value={protein}
            onChange={setProtein}
          />
        )}
        {active.includes("carbs") && (
          <RangeSlider
            label={"Węglowodany"}
            min={0}
            max={100}
            step={1}
            value={carbs}
            onChange={setCarbs}
          />
        )}
        {active.includes("fat") && (
          <RangeSlider
            label={"Tłuszcz"}
            min={0}
            max={100}
            step={1}
            value={fat}
            onChange={setFat}
          />
        )}
        {active.includes("date") && (
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onOpen={openCalendarModal}
          />
        )}
      </ScrollView>

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: theme.border,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
          backgroundColor: theme.background,
        }}
      >
        {hasActive ? (
          <>
            <PrimaryButton label={"Zastosuj filtry"} onPress={apply} />
            <SecondaryButton label={"Wyczyść"} onPress={clear} />
          </>
        ) : (
          <SecondaryButton label={"Anuluj"} onPress={clear} />
        )}
      </View>

      <Modal
        visible={openPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenPicker(false)}
      >
        <Pressable
          onPress={() => setOpenPicker(false)}
          style={{
            flex: 1,
            backgroundColor: theme.shadow,
            justifyContent: "center",
            alignItems: "center",
            padding: theme.spacing.md,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: theme.rounded.lg,
              backgroundColor: theme.card,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.border,
              gap: theme.spacing.md,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontWeight: "700",
                fontSize: theme.typography.size.md,
              }}
            >
              Wybierz filtr
            </Text>

            <View style={{ gap: 10 }}>
              {ALL_FILTERS.map(({ key, label }) => {
                const selected = active.includes(key);
                return (
                  <Pressable
                    key={key}
                    onPress={() => addOrRemove(key)}
                    style={[
                      styles.rowItem,
                      {
                        borderColor: selected
                          ? theme.accentSecondary
                          : theme.border,
                        backgroundColor: selected
                          ? theme.overlay
                          : theme.background,
                        borderRadius: theme.rounded.md,
                      },
                    ]}
                  >
                    <Text style={{ color: theme.text }}>{label}</Text>
                    <Text
                      style={{
                        color: selected
                          ? theme.accentSecondary
                          : theme.textSecondary,
                        fontWeight: "700",
                      }}
                    >
                      {selected ? "✓" : "+"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ gap: theme.spacing.sm }}>
              <PrimaryButton
                label={"Gotowe"}
                onPress={() => setOpenPicker(false)}
              />
              <SecondaryButton
                label={"Resetuj"}
                onPress={() => setActive([])}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={openCalendar}
        transparent
        animationType="fade"
        onRequestClose={cancelCalendar}
      >
        <Pressable
          onPress={cancelCalendar}
          style={{
            flex: 1,
            backgroundColor: theme.shadow,
            justifyContent: "center",
            alignItems: "center",
            padding: theme.spacing.md,
          }}
        >
          <Pressable
            onPress={() => {}}
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: theme.rounded.lg,
              backgroundColor: theme.card,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.border,
              gap: theme.spacing.md,
            }}
          >
            <Text
              style={{
                color: theme.text,
                fontWeight: "700",
                fontSize: theme.typography.size.md,
              }}
            >
              Ustaw zakres dat
            </Text>

            <Calendar
              startDate={localRange.start}
              endDate={localRange.end}
              focus={focus}
              onChangeRange={(r) => setLocalRange(r)}
              onToggleFocus={() =>
                setFocus((f) => (f === "start" ? "end" : "start"))
              }
            />

            <View style={{ flexDirection: "column", gap: theme.spacing.sm }}>
              <PrimaryButton label={"Zapisz"} onPress={applyCalendar} />
              <SecondaryButton label={"Anuluj"} onPress={cancelCalendar} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  rowItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
