import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { IconButton } from "@/components";
import AppIcon from "@/components/AppIcon";
import { useTranslation } from "react-i18next";

export type WeekDayItem = {
  date: Date;
  label: string;
  isToday: boolean;
};

type Props = {
  days: WeekDayItem[];
  selectedDate: Date;
  onSelect: (d: Date) => void;
  onOpenHistory: () => void;
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
  const { t } = useTranslation("history");

  return (
    <View style={styles.row}>
      <View style={styles.daysRow}>
        {days.map((d) => {
          const selected =
            d.date.toDateString() === selectedDate.toDateString();

          return (
            <Pressable
              key={d.date.toISOString()}
              onPress={() => onSelect(d.date)}
              style={[
                styles.pill,
                selected ? styles.pillSelected : styles.pillDefault,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  selected ? styles.dayTextSelected : styles.dayTextDefault,
                  d.isToday ? styles.dayTextToday : styles.dayTextRegular,
                ]}
              >
                {d.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rightBox}>
        <IconButton
          accessibilityLabel={t("weekStrip.open_history")}
          variant="ghost"
          onPress={onOpenHistory}
          icon={<AppIcon name="calendar" />}
        />
      </View>
    </View>
  );
}

const DAY_W = 40;
const DAY_H = 36;

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
      gap: theme.spacing.sm,
    },
    pill: {
      width: DAY_W,
      height: DAY_H,
      borderRadius: DAY_H / 2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    pillSelected: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    pillDefault: {
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
    },
    dayText: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
    },
    dayTextSelected: {
      color: theme.primaryStrong,
    },
    dayTextDefault: {
      color: theme.text,
    },
    dayTextToday: {
      fontFamily: theme.typography.fontFamily.bold,
    },
    dayTextRegular: {
      fontFamily: theme.typography.fontFamily.medium,
    },
    rightBox: {
      width: 56,
      alignItems: "flex-end",
      justifyContent: "center",
      marginLeft: theme.spacing.sm,
    },
  });
