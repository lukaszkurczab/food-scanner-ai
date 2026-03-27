import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import AppIcon from "@/components/AppIcon";

export type WeekDayItem = {
  date: Date;
  label?: string;
  isToday: boolean;
};

type Props = {
  days: WeekDayItem[];
  selectedDate: Date;
  onSelect: (d: Date) => void;
  onOpenHistory?: () => void;
  streak?: number;
};

export default function WeekStrip({
  days,
  selectedDate,
  onSelect,
  onOpenHistory,
}: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { i18n, t } = useTranslation("history");
  const weekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n?.language || undefined, {
        weekday: "short",
      }),
    [i18n?.language],
  );

  return (
    <View style={styles.row}>
      <View style={styles.daysRow}>
        {days.map((d) => {
          const selected =
            d.date.toDateString() === selectedDate.toDateString();
          const hasWeekdayLabel =
            typeof d.label === "string" && /[^\d\s]/.test(d.label);
          const rawWeekdayLabel = hasWeekdayLabel
            ? d.label!
            : weekdayFormatter.format(d.date);
          const weekdayLabel = rawWeekdayLabel.replace(".", "");
          const dayNumber = String(d.date.getDate()).padStart(2, "0");

          return (
            <Pressable
              key={d.date.toISOString()}
              onPress={() => onSelect(d.date)}
              accessibilityRole="button"
              accessibilityLabel={`${weekdayLabel} ${dayNumber}`}
              style={({ pressed }) => [
                styles.dayItem,
                selected && styles.dayItemSelected,
                pressed ? styles.dayItemPressed : null,
              ]}
            >
              <Text
                style={[
                  styles.weekdayText,
                  selected
                    ? styles.weekdayTextSelected
                    : styles.weekdayTextDefault,
                ]}
              >
                {weekdayLabel}
              </Text>
              <Text
                style={[
                  styles.dayNumberText,
                  selected
                    ? styles.dayNumberTextSelected
                    : styles.dayNumberTextDefault,
                  d.isToday ? styles.dayNumberToday : null,
                ]}
              >
                {dayNumber}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {onOpenHistory ? (
        <Pressable
          onPress={onOpenHistory}
          accessibilityRole="button"
          accessibilityLabel={t("weekStrip.open_history")}
          style={({ pressed }) => [
            styles.historyButton,
            pressed ? styles.historyButtonPressed : null,
          ]}
        >
          <AppIcon name="history" size={20} color={theme.text} />
        </Pressable>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "center",
      width: "100%",
    },
    daysRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      gap: theme.spacing.xxs,
    },
    dayItem: {
      flex: 1,
      minWidth: 0,
      minHeight: 68,
      borderRadius: theme.rounded.sm,
      alignItems: "center",
      justifyContent: "center",
    },
    dayItemSelected: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    dayItemPressed: {
      opacity: 0.92,
    },
    weekdayText: {
      fontSize: theme.typography.size.overline,
      lineHeight: theme.typography.lineHeight.labelS,
      fontFamily: theme.typography.fontFamily.medium,
      textTransform: "uppercase",
    },
    weekdayTextDefault: {
      color: theme.textSecondary,
    },
    weekdayTextSelected: {
      color: theme.textInverse,
    },
    dayNumberText: {
      fontSize: theme.typography.size.numericM,
      lineHeight: theme.typography.lineHeight.numericM,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    dayNumberTextDefault: {
      color: theme.text,
    },
    dayNumberTextSelected: {
      color: theme.textInverse,
    },
    dayNumberToday: {
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    historyButton: {
      width: 44,
      height: 44,
      marginLeft: theme.spacing.sm,
      borderRadius: theme.rounded.md,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: theme.borderSoft,
      backgroundColor: theme.surfaceElevated,
    },
    historyButtonPressed: {
      backgroundColor: theme.surface,
    },
  });
