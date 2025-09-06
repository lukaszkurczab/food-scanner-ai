import React, { useMemo, useState } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import { Calendar } from "./Calendar";
import { PrimaryButton } from "./PrimaryButton";
import { SecondaryButton } from "./SecondaryButton";

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
    let s = new Date(r.start);
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
    <View style={{ width: "100%", gap: 8 }}>
      <Text style={{ color: theme.text, fontWeight: "600" }}>
        {t("statistics:ranges.custom")}
      </Text>

      <View style={[styles.rowCenter, { gap: 8 }]}>
        <Pressable
          onPress={() => open("start")}
          style={[
            styles.input,
            {
              borderColor: theme.border,
              backgroundColor: theme.card,
              borderRadius: theme.rounded.sm,
            },
          ]}
        >
          <Text
            style={{ color: theme.text, textAlign: "center", width: "100%" }}
          >
            {fmt.format(range.start)}
          </Text>
        </Pressable>

        <Text style={{ color: theme.textSecondary }}>—</Text>

        <Pressable
          onPress={() => open("end")}
          style={[
            styles.input,
            {
              borderColor: theme.border,
              backgroundColor: theme.card,
              borderRadius: theme.rounded.sm,
            },
          ]}
        >
          <Text
            style={{ color: theme.text, textAlign: "center", width: "100%" }}
          >
            {fmt.format(range.end)}
          </Text>
        </Pressable>
      </View>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={cancel}
      >
        <View style={styles.backdrop}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
                borderRadius: theme.rounded.md,
              },
            ]}
          >
            <Text
              style={[
                styles.title,
                { color: theme.text, fontSize: theme.typography.size.md },
              ]}
            >
              {t("statistics:pickRange")}
            </Text>

            <Calendar
              startDate={temp.start}
              endDate={temp.end}
              focus={focus}
              onChangeRange={handleCalendarChange}
              onToggleFocus={handleToggleFocus}
              minDate={minDate}
              maxDate={maxDate}
            />

            <View style={{ height: 16 }} />

            <View style={styles.buttonsCol}>
              <PrimaryButton label={t("common:confirm")} onPress={confirm} />
              <SecondaryButton label={t("common:cancel")} onPress={cancel} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  rowCenter: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  card: { width: "100%", borderWidth: 1, padding: 14 },
  title: { fontWeight: "700", marginBottom: 8, fontSize: 16 },
  buttonsCol: {
    gap: 10,
  },
});
