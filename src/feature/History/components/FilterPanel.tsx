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
import { Button, RangeSlider } from "@/components";
import { DateRangePicker } from "@/components/DateRangePicker";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";
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
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const allFilters: { key: FilterKey; label: string }[] = useMemo(
    () => [
      { key: "calories", label: t("filters.calories", { ns: "history" }) },
      { key: "protein", label: t("filters.protein", { ns: "history" }) },
      { key: "carbs", label: t("filters.carbs", { ns: "history" }) },
      { key: "fat", label: t("filters.fat", { ns: "history" }) },
      { key: "date", label: t("filters.date", { ns: "history" }) },
    ],
    [t],
  );

  const initialRange: Range = useMemo(() => {
    const today = new Date();

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
    applyFilters(buildPayload());
  };

  const clear = () => {
    setActive([]);
    clearFilters();
  };

  const summaryChips = useMemo(
    () =>
      active.map((k) => {
        const meta = allFilters.find((f) => f.key === k)!;
        return (
          <Pressable key={k} onPress={() => removeChip(k)} style={styles.chip}>
            <Text style={styles.chipLabel}>{meta.label}</Text>
            <Text style={styles.chipIcon}>
              {t("symbols.times", { ns: "history" })}
            </Text>
          </Pressable>
        );
      }),
    [active, allFilters, styles, t],
  );

  const hasActive = active.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>
              {t("title", { ns: "history" })}
            </Text>
            <Button
              variant="secondary"
              label={t("addFilter", { ns: "history" })}
              onPress={() => setOpenPicker(true)}
              style={styles.addFilterButton}
            />
          </View>

          {hasActive ? (
            <View style={styles.chipRow}>{summaryChips}</View>
          ) : (
            <Text style={styles.emptyText}>
              {t("noneSelected", { ns: "history" })}
            </Text>
          )}
        </View>

        {active.includes("calories") ? (
          <RangeSlider
            label={t("filters.calories", { ns: "history" })}
            min={0}
            max={2000}
            step={10}
            value={calories}
            onChange={setCalories}
          />
        ) : null}

        {active.includes("protein") ? (
          <RangeSlider
            label={t("filters.protein", { ns: "history" })}
            min={0}
            max={100}
            step={1}
            value={protein}
            onChange={setProtein}
          />
        ) : null}

        {active.includes("carbs") ? (
          <RangeSlider
            label={t("filters.carbs", { ns: "history" })}
            min={0}
            max={100}
            step={1}
            value={carbs}
            onChange={setCarbs}
          />
        ) : null}

        {active.includes("fat") ? (
          <RangeSlider
            label={t("filters.fat", { ns: "history" })}
            min={0}
            max={100}
            step={1}
            value={fat}
            onChange={setFat}
          />
        ) : null}

        {active.includes("date") ? (
          <DateRangePicker
            startDate={dateRange.start}
            endDate={dateRange.end}
            onOpen={openCalendarModal}
          />
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        {hasActive ? (
          <GlobalActionButtons
            label={t("actions.apply", { ns: "history" })}
            onPress={apply}
            secondaryLabel={t("actions.clear", { ns: "history" })}
            secondaryOnPress={clear}
          />
        ) : (
          <Button
            variant="secondary"
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
          <Pressable onPress={() => {}} style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {t("actions.choose", { ns: "history" })}
            </Text>

            <View style={styles.modalList}>
              {allFilters.map(({ key, label }) => {
                const selected = active.includes(key);

                return (
                  <Pressable
                    key={key}
                    onPress={() => addOrRemove(key)}
                    style={[
                      styles.rowItem,
                      selected ? styles.rowItemSelected : styles.rowItemDefault,
                    ]}
                  >
                    <Text style={styles.rowItemLabel}>{label}</Text>
                    <Text
                      style={[
                        styles.rowItemIcon,
                        selected ? styles.rowItemIconActive : null,
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

            <GlobalActionButtons
              label={t("actions.done", { ns: "history" })}
              onPress={() => setOpenPicker(false)}
              secondaryLabel={t("actions.reset", { ns: "history" })}
              secondaryOnPress={() => setActive([])}
              containerStyle={styles.modalActions}
            />
          </Pressable>
        </Pressable>
      </Modal>

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
          <Pressable onPress={() => {}} style={styles.modalCard}>
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

            <GlobalActionButtons
              label={t("actions.save", { ns: "history" })}
              onPress={applyCalendar}
              secondaryLabel={t("actions.cancel", { ns: "history" })}
              secondaryOnPress={() => setOpenCalendar(false)}
              containerStyle={styles.modalActions}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      gap: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    headerTitle: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      flex: 1,
    },
    addFilterButton: {
      maxWidth: 200,
    },
    chipRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    emptyText: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
    },
    chip: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.primary,
      borderRadius: theme.rounded.full,
    },
    chipLabel: {
      color: theme.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    chipIcon: {
      color: theme.primary,
      marginLeft: theme.spacing.sm,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.bold,
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: theme.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      backgroundColor: theme.background,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: theme.isDark ? "rgba(0,0,0,0.48)" : "rgba(0,0,0,0.24)",
      justifyContent: "center",
      alignItems: "center",
      padding: theme.spacing.md,
    },
    modalCard: {
      width: "100%",
      maxWidth: 560,
      borderRadius: theme.rounded.lg,
      backgroundColor: theme.surfaceElevated,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.border,
      gap: theme.spacing.md,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.22 : 0.1,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    modalTitle: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
    },
    modalList: {
      gap: theme.spacing.sm,
    },
    rowItem: {
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderRadius: theme.rounded.md,
    },
    rowItemDefault: {
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    rowItemSelected: {
      borderColor: theme.primary,
      backgroundColor: theme.primarySoft,
    },
    rowItemLabel: {
      color: theme.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    rowItemIcon: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
    },
    rowItemIconActive: {
      color: theme.primary,
    },
    modalActions: {
      gap: theme.spacing.sm,
    },
  });
