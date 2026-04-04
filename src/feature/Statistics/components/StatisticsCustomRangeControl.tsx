import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { Calendar, Modal } from "@/components";
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";
import type { DateRange } from "@/feature/Statistics/types";

type Props = {
  range: DateRange;
  onApply: (range: DateRange) => void;
};

const startOfDay = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const normalizeRange = (range: DateRange): DateRange => {
  const start = startOfDay(range.start);
  const end = startOfDay(range.end);
  if (start <= end) return { start, end };
  return { start: end, end: start };
};

export function StatisticsCustomRangeControl({ range, onApply }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation(["statistics", "common"]);

  const [visible, setVisible] = useState(false);
  const [focus, setFocus] = useState<"start" | "end">("start");
  const [draftRange, setDraftRange] = useState<DateRange>(range);

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat(i18n.language, {
        day: "2-digit",
        month: "short",
      }),
    [i18n.language],
  );

  const rangeSummary = `${formatter.format(range.start)} - ${formatter.format(range.end)}`;

  const openModal = () => {
    setDraftRange(range);
    setFocus("start");
    setVisible(true);
  };

  const closeModal = () => {
    setVisible(false);
    setDraftRange(range);
  };

  const applyRange = () => {
    onApply(normalizeRange(draftRange));
    setVisible(false);
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={openModal}
        style={({ pressed }) => [styles.trigger, pressed ? styles.triggerPressed : null]}
        testID="statistics-custom-range-trigger"
      >
        <View style={styles.triggerTextWrap}>
          <Text style={styles.triggerLabel}>
            {t("statistics:customRange.label")}
          </Text>
          <Text style={styles.triggerValue}>{rangeSummary}</Text>
        </View>

        <AppIcon name="calendar" size={18} color={theme.textSecondary} />
      </Pressable>

      <Modal
        visible={visible}
        title={t("statistics:customRange.modalTitle")}
        onClose={closeModal}
        primaryAction={{
          label: t("common:apply"),
          onPress: applyRange,
        }}
        secondaryAction={{
          label: t("common:cancel"),
          onPress: closeModal,
        }}
      >
        <View style={styles.modalBody}>
          <Text style={styles.modalRangeSummary}>{`${formatter.format(draftRange.start)} - ${formatter.format(draftRange.end)}`}</Text>
          <Calendar
            startDate={draftRange.start}
            endDate={draftRange.end}
            focus={focus}
            onChangeRange={setDraftRange}
            onToggleFocus={() =>
              setFocus((current) => (current === "start" ? "end" : "start"))
            }
            maxDate={new Date()}
          />
        </View>
      </Modal>
    </>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    trigger: {
      marginTop: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      borderRadius: theme.rounded.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    triggerPressed: {
      opacity: 0.92,
    },
    triggerTextWrap: {
      flex: 1,
      gap: theme.spacing.xxs,
    },
    triggerLabel: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
    },
    triggerValue: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    modalBody: {
      gap: theme.spacing.md,
    },
    modalRangeSummary: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      textAlign: "center",
    },
  });
