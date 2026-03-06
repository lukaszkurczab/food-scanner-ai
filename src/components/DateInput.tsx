import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { Calendar } from "./Calendar";
import { GlobalActionButtons } from "@/components/GlobalActionButtons";

export type DateRange = { start: Date; end: Date };

type Props = {
  range: DateRange;
  onChange: (range: DateRange) => void;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
  allowSingleDay?: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

export const DateInput: React.FC<Props> = ({
  range,
  onChange,
  minDate,
  maxDate,
  locale,
  allowSingleDay = false,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t, i18n } = useTranslation(["statistics", "common"]);
  const [visible, setVisible] = useState(false);
  const [focus, setFocus] = useState<"start" | "end">("start");
  const [temp, setTemp] = useState<DateRange>(range);

  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale || i18n.language, {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [locale, i18n.language]
  );

  const open = (f: "start" | "end") => {
    setFocus(f);
    setTemp(range);
    setVisible(true);
  };

  const normalizeRange = (r: DateRange): DateRange => {
    const s = new Date(r.start);
    let e = new Date(r.end);
    if (!allowSingleDay && +e < +s + DAY) e = new Date(+s + DAY);
    if (allowSingleDay && +e < +s) e = new Date(+s);
    return { start: s, end: e };
  };

  const handleCalendarChange = (r: DateRange) => {
    const fixed = normalizeRange(r);
    setTemp(fixed);
  };

  const handleToggleFocus = () =>
    setFocus((f) => (f === "start" ? "end" : "start"));

  const confirm = () => {
    setVisible(false);
    onChange(normalizeRange(temp));
  };
  const cancel = () => {
    setVisible(false);
    setTemp(range);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t("statistics:ranges.custom")}</Text>

      <View style={styles.rowCenter}>
        <Pressable onPress={() => open("start")} style={styles.input}>
          <Text style={styles.inputText}>{fmt.format(range.start)}</Text>
        </Pressable>

        <Text style={styles.separator}>—</Text>

        <Pressable onPress={() => open("end")} style={styles.input}>
          <Text style={styles.inputText}>{fmt.format(range.end)}</Text>
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={cancel}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>{t("statistics:pickRange")}</Text>

            <Calendar
              startDate={temp.start}
              endDate={temp.end}
              focus={focus}
              onChangeRange={handleCalendarChange}
              onToggleFocus={handleToggleFocus}
              minDate={minDate}
              maxDate={maxDate}
            />

            <View style={styles.spacer} />

            <GlobalActionButtons
              label={t("common:confirm")}
              onPress={confirm}
              secondaryLabel={t("common:cancel")}
              secondaryOnPress={cancel}
              containerStyle={styles.buttonsCol}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      width: "100%",
      gap: theme.spacing.sm,
    },
    label: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.medium,
    },
    rowCenter: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    input: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      borderRadius: theme.rounded.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
    inputText: {
      color: theme.text,
      textAlign: "center",
      width: "100%",
    },
    separator: {
      color: theme.textSecondary,
    },
    backdrop: {
      flex: 1,
      backgroundColor: theme.shadow,
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing.md,
    },
    card: {
      width: "100%",
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.rounded.md,
      backgroundColor: theme.background,
      padding: theme.spacing.md,
    },
    title: {
      color: theme.text,
      fontSize: theme.typography.size.md,
      fontFamily: theme.typography.fontFamily.bold,
      marginBottom: theme.spacing.sm,
    },
    spacer: {
      height: theme.spacing.md,
    },
    buttonsCol: {
      gap: theme.spacing.sm,
    },
  });
