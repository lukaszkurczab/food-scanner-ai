import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";

type Range = { start: Date; end: Date };

type Props = {
  startDate: Date;
  endDate: Date;
  focus: "start" | "end";
  onChangeRange: (range: Range) => void;
  onToggleFocus?: () => void;
  minDate?: Date;
  maxDate?: Date;
  mode?: "range" | "single";
  onPickSingle?: (date: Date) => void;
};

type Cell = { date: Date; inMonth: boolean };

const GAP = 6;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const isSameDay = (a: Date, b: Date) => +startOfDay(a) === +startOfDay(b);
const clampToBounds = (d: Date, min?: Date, max?: Date) => {
  const t = +startOfDay(d);
  let out = t;
  if (min && t < +startOfDay(min)) out = +startOfDay(min);
  if (max && t > +startOfDay(max)) out = +startOfDay(max);
  return new Date(out);
};

export const Calendar: React.FC<Props> = ({
  startDate,
  endDate,
  focus,
  onChangeRange,
  onToggleFocus,
  minDate,
  maxDate,
  mode = "range",
  onPickSingle,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { i18n } = useTranslation();
  const locale = i18n.language;

  const normalized = useMemo(() => {
    const s = startOfDay(startDate);
    const e = startOfDay(endDate);
    return { s, e };
  }, [startDate, endDate]);

  const [cursor, setCursor] = useState<Date>(startOfDay(new Date()));
  const [wrapW, setWrapW] = useState(0);
  const cellSize = wrapW ? Math.floor((wrapW - GAP * 6) / 7) : 0;

  const monthStart = useMemo(() => {
    const d = new Date(cursor);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [cursor]);

  const month = monthStart.getMonth();
  const year = monthStart.getFullYear();

  const firstDay = (() => {
    const js = new Date(year, month, 1).getDay();
    return (js + 6) % 7;
  })();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const cells: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const row = Math.floor(i / 7);
    const col = i % 7;
    let dayNum: number;
    let cellDate: Date;
    let inMonth = true;

    if (row === 0 && col < firstDay) {
      dayNum = prevMonthDays - firstDay + col + 1;
      cellDate = new Date(year, month - 1, dayNum);
      inMonth = false;
    } else if (i - firstDay + 1 > daysInMonth) {
      dayNum = i - firstDay + 1 - daysInMonth;
      cellDate = new Date(year, month + 1, dayNum);
      inMonth = false;
    } else {
      dayNum = i - firstDay + 1;
      cellDate = new Date(year, month, dayNum);
    }
    cells.push({ date: startOfDay(cellDate), inMonth });
  }

  const fmtMonth = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    [locale]
  );
  const fmtWeekday = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(2024, 0, 1 + i);
        return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
      }),
    [locale]
  );

  const handlePrev = () => setCursor(new Date(year, month - 1, 1));
  const handleNext = () => setCursor(new Date(year, month + 1, 1));

  const select = (d: Date) => {
    const bounded = clampToBounds(d, minDate, maxDate);
    if (mode === "single") {
      onPickSingle?.(bounded);
      return;
    }
    let s = normalized.s;
    let e = normalized.e;
    if (focus === "start") {
      if (isSameDay(bounded, s) && isSameDay(s, e)) {
        onChangeRange({ start: s, end: s });
        return;
      }
      s = bounded;
      e = bounded;
      onChangeRange({ start: s, end: e });
      onToggleFocus?.();
    } else {
      if (isSameDay(bounded, s)) {
        onChangeRange({ start: s, end: s });
      } else {
        e = bounded;
        onChangeRange({ start: s, end: e });
      }
      onToggleFocus?.();
    }
  };

  const isDisabled = (d: Date) =>
    (minDate && +d < +startOfDay(minDate)) ||
    (maxDate && +d > +startOfDay(maxDate));

  const today = startOfDay(new Date());
  const selStart = normalized.s;
  const selEnd = normalized.e;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handlePrev} style={styles.navBtn}>
          <Text style={styles.navText}>‹</Text>
        </Pressable>

        <Text style={styles.monthText}>
          {fmtMonth.format(monthStart)}
        </Text>

        <Pressable onPress={handleNext} style={styles.navBtn}>
          <Text style={styles.navText}>›</Text>
        </Pressable>
      </View>

      <View onLayout={(e) => setWrapW(e.nativeEvent.layout.width)}>
        <View style={[styles.weekRow, { marginBottom: theme.spacing.xs }]}>
          {fmtWeekday.map((wd, i) => (
            <Text
              key={i}
              style={[
                styles.weekText,
                {
                  width: cellSize,
                  marginRight: i % 7 !== 6 ? GAP : 0,
                  color: theme.textSecondary,
                  textAlign: "center",
                },
              ]}
            >
              {wd.toUpperCase()}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {cells.map((c, i) => {
            const selectedStart = isSameDay(c.date, selStart);
            const selectedEnd = isSameDay(c.date, selEnd);
            const selected =
              selectedStart ||
              selectedEnd ||
              inBetween(c.date, selStart, selEnd);

            const disabled = isDisabled(c.date);

            return (
              <Pressable
                key={i}
                onPress={() => !disabled && select(c.date)}
                disabled={disabled}
                style={[
                  styles.cell,
                  {
                    opacity: disabled ? 0.4 : 1,
                    width: cellSize,
                    height: cellSize,
                    marginRight: i % 7 !== 6 ? GAP : 0,
                    marginBottom: GAP,
                  },
                ]}
              >
                {selected && (
                  <View
                    style={[
                      styles.dotCircle,
                      {
                        borderColor: theme.accentSecondary,
                        borderWidth: 2,
                        borderRadius: theme.rounded.full,
                      },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.dayText,
                    c.inMonth ? styles.dayTextInMonth : styles.dayTextOutsideMonth,
                  ]}
                >
                  {c.date.getDate()}
                </Text>
                {isSameDay(c.date, today) && (
                  <View
                    style={[
                      styles.todayMark,
                      { backgroundColor: theme.link, marginTop: 3 },
                    ]}
                  />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

function inBetween(d: Date, s: Date, e: Date) {
  const t = +startOfDay(d);
  const ss = +startOfDay(s);
  const ee = +startOfDay(e);
  if (ss === ee) return ss === t;
  const [lo, hi] = ss < ee ? [ss, ee] : [ee, ss];
  return t >= lo && t <= hi;
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      width: "100%",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
    },
    navBtn: {
      borderRadius: theme.rounded.full,
      padding: theme.spacing.sm,
    },
    navText: {
      color: theme.link,
      fontSize: theme.typography.size.lg,
    },
    monthText: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.lg,
    },
    weekRow: { flexDirection: "row" },
    weekText: { fontSize: theme.typography.size.xs },
    grid: { flexDirection: "row", flexWrap: "wrap" },
    cell: { alignItems: "center", justifyContent: "center" },
    dayText: {
      fontFamily: theme.typography.fontFamily.regular,
    },
    dayTextInMonth: {
      color: theme.text,
    },
    dayTextOutsideMonth: {
      color: theme.textSecondary,
    },
    dotCircle: { position: "absolute", width: "82%", height: "82%" },
    todayMark: {
      width: theme.spacing.xs,
      height: theme.spacing.xs,
      borderRadius: theme.spacing.xs / 2,
    },
  });
