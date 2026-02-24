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
  isPremium?: boolean,
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
}> = ({ scope, isPremium = false, windowDays }) => {
  const theme = useTheme();
  const { t } = useTranslation(["history", "common"]);
  const { filters: ctxFilters, applyFilters, clearFilters } = useFilters(scope);
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);

  const ALL_FILTERS: { key: FilterKey; label: string }[] = useMemo(
    () => [
      { key: "calories", label: t("filters.calories", { ns: "history" }) },
      { key: "protein", label: t("filters.protein", { ns: "history" }) },
      { key: "carbs", label: t("filters.carbs", { ns: "history" }) },
      { key: "fat", label: t("filters.fat", { ns: "history" }) },
      { key: "date", label: t("filters.date", { ns: "history" }) },
    ],
    [t],
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
    (ctxFilters?.calories as [number, number]) ?? DEFAULTS.calories,
  );
  const [protein, setProtein] = useState<[number, number]>(
    (ctxFilters?.protein as [number, number]) ?? DEFAULTS.protein,
  );
  const [carbs, setCarbs] = useState<[number, number]>(
    (ctxFilters?.carbs as [number, number]) ?? DEFAULTS.carbs,
  );
  const [fat, setFat] = useState<[number, number]>(
    (ctxFilters?.fat as [number, number]) ?? DEFAULTS.fat,
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
  }, [ctxFilters]);

  const addOrRemove = (k: FilterKey) =>
    setActive((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k],
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

  const clear = () => {
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
            style={styles.chip}
          >
            <Text style={styles.chipLabel}>{meta.label}</Text>
            <Text style={styles.chipIcon}>
              {t("symbols.times", { ns: "history" })}
            </Text>
          </Pressable>
        );
      }),
    [active, ALL_FILTERS, theme, t],
  );

  const hasActive = active.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          <View
            style={styles.headerRow}
          >
            <Text style={styles.headerTitle}>
              {t("title", { ns: "history" })}
            </Text>
            <SecondaryButton
              label={t("addFilter", { ns: "history" })}
              onPress={() => setOpenPicker(true)}
              style={styles.addFilterButton}
            />
          </View>

          {hasActive ? (
            <View style={styles.chipRow}>
              {summaryChips}
            </View>
          ) : (
            <Text style={styles.emptyText}>
              {t("noneSelected", { ns: "history" })}
            </Text>
          )}
        </View>

        {active.includes("calories") && (
          <RangeSlider
            label={t("filters.calories", { ns: "history" })}
            min={0}
            max={2000}
            step={10}
            value={calories}
            onChange={setCalories}
          />
        )}
        {active.includes("protein") && (
          <RangeSlider
            label={t("filters.protein", { ns: "history" })}
            min={0}
            max={100}
            step={1}
            value={protein}
            onChange={setProtein}
          />
        )}
        {active.includes("carbs") && (
          <RangeSlider
            label={t("filters.carbs", { ns: "history" })}
            min={0}
            max={100}
            step={1}
            value={carbs}
            onChange={setCarbs}
          />
        )}
        {active.includes("fat") && (
          <RangeSlider
            label={t("filters.fat", { ns: "history" })}
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
        style={styles.footer}
      >
        {hasActive ? (
          <>
            <PrimaryButton
              label={t("actions.apply", { ns: "history" })}
              onPress={apply}
            />
            <SecondaryButton
              label={t("actions.clear", { ns: "history" })}
              onPress={clear}
            />
          </>
        ) : (
          <SecondaryButton
            label={t("actions.cancel", { ns: "history" })}
            onPress={clear}
          />
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
          style={styles.modalBackdrop}
        >
          <Pressable
            onPress={() => {}}
            style={styles.modalCard}
          >
            <Text style={styles.modalTitle}>
              {t("actions.choose", { ns: "history" })}
            </Text>

            <View style={styles.modalList}>
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
                      },
                    ]}
                  >
                    <Text style={styles.rowItemLabel}>{label}</Text>
                    <Text
                      style={[
                        styles.rowItemIcon,
                        selected && styles.rowItemIconActive,
                      ]}
                    >
                      {selected
                        ? t("symbols.check", { ns: "history" })
                        : t("symbols.plus", { ns: "history" })}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton
                label={t("actions.done", { ns: "history" })}
                onPress={() => setOpenPicker(false)}
              />
              <SecondaryButton
                label={t("actions.reset", { ns: "history" })}
                onPress={() => setActive([])}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Calendar Modal */}
      <Modal
        visible={openCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setOpenCalendar(false)}
      >
        <Pressable
          onPress={() => setOpenCalendar(false)}
          style={styles.modalBackdrop}
        >
          <Pressable
            onPress={() => {}}
            style={styles.modalCard}
          >
            <Text style={styles.modalTitle}>
              {t("actions.selectDateRange", { ns: "history" })}
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

            <View style={styles.modalActions}>
              <PrimaryButton
                label={t("actions.save", { ns: "history" })}
                onPress={applyCalendar}
              />
              <SecondaryButton
                label={t("actions.cancel", { ns: "history" })}
                onPress={() => setOpenCalendar(false)}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    scroll: { flex: 1 },
    scrollContent: { gap: theme.spacing.lg },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
    },
    headerTitle: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.md,
    },
    addFilterButton: { paddingVertical: theme.spacing.sm, maxWidth: 200 },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm },
    emptyText: { color: theme.textSecondary },
    chip: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.card,
      borderColor: theme.accentSecondary,
      borderRadius: theme.rounded.full,
    },
    chipLabel: { color: theme.text },
    chipIcon: { color: theme.accentSecondary, marginLeft: theme.spacing.sm },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.shadow,
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.md,
    },
    modalCard: {
      width: "100%",
      maxWidth: 560,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.card,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      gap: theme.spacing.md,
    },
    modalTitle: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.md,
    },
    modalList: { gap: theme.spacing.sm },
    rowItem: {
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1.5,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: theme.rounded.sm,
    },
    rowItemLabel: { color: theme.text },
    rowItemIcon: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.bold,
    },
    rowItemIconActive: { color: theme.accentSecondary },
    modalActions: { gap: theme.spacing.sm },
  });
