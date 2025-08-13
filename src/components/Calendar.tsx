import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  startDate: Date;
  endDate: Date;
  focus: "start" | "end";
  onChangeRange: (range: { start: Date; end: Date }) => void;
  onToggleFocus?: () => void;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
};

type Cell = { date: Date; inMonth: boolean };

const DAY = 24 * 60 * 60 * 1000;

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const isSameDay = (a: Date, b: Date) => +startOfDay(a) === +startOfDay(b);
const clamp = (d: Date, min?: Date, max?: Date) => {
  let t = +startOfDay(d);
  if (min && t < +startOfDay(min)) t = +startOfDay(min);
  if (max && t > +startOfDay(max)) t = +startOfDay(max);
  return new Date(t);
};
const inRange = (d: Date, a: Date, b: Date) => {
  const t = +startOfDay(d),
    aa = +startOfDay(a),
    bb = +startOfDay(b);
  const [lo, hi] = aa <= bb ? [aa, bb] : [bb, aa];
  return t >= lo && t <= hi;
};

export const Calendar: React.FC<Props> = ({
  startDate,
  endDate,
  focus,
  onChangeRange,
  onToggleFocus,
  minDate,
  maxDate,
  locale,
}) => {
  const theme = useTheme();
  const [cursor, setCursor] = useState<Date>(startOfDay(startDate));

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
      inMonth = true;
    }
    cells.push({ date: startOfDay(cellDate), inMonth });
  }

  const fmtMonth = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }),
    [locale, year, month]
  );
  const fmtWeekday = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(2024, 0, 1 + i); // 1.01.2024 = poniedziałek
        return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d);
      }),
    [locale]
  );

  const handlePrev = () => setCursor(new Date(year, month - 1, 1));
  const handleNext = () => setCursor(new Date(year, month + 1, 1));

  const select = (d: Date) => {
    const bounded = clamp(d, minDate, maxDate);
    const s = startOfDay(startDate);
    const e = startOfDay(endDate);

    if (focus === "start") {
      let newStart = bounded;
      let newEnd = e;
      if (+newEnd < +newStart + DAY) newEnd = new Date(+newStart + DAY);
      onChangeRange({ start: newStart, end: newEnd });
      onToggleFocus?.();
      return;
    }

    let newEnd = bounded;
    let newStart = s;
    if (+newEnd < +newStart + DAY) newStart = new Date(+newEnd - DAY);
    onChangeRange({ start: newStart, end: newEnd });
    onToggleFocus?.();
  };

  const isDisabled = (d: Date) =>
    (minDate && +d < +startOfDay(minDate)) ||
    (maxDate && +d > +startOfDay(maxDate));

  const today = startOfDay(new Date());
  const selStart = startOfDay(startDate);
  const selEnd = startOfDay(endDate);

  return (
    <View style={{ width: "100%" }}>
      <View style={[styles.header, { marginBottom: theme.spacing.xs }]}>
        <Pressable onPress={handlePrev} style={styles.navBtn}>
          <Text
            style={{ color: theme.link, fontSize: theme.typography.size.md }}
          >
            ‹
          </Text>
        </Pressable>
        <Text
          style={{
            color: theme.text,
            fontWeight: "700",
            fontSize: theme.typography.size.md,
          }}
        >
          {fmtMonth.format(monthStart)}
        </Text>
        <Pressable onPress={handleNext} style={styles.navBtn}>
          <Text
            style={{ color: theme.link, fontSize: theme.typography.size.md }}
          >
            ›
          </Text>
        </Pressable>
      </View>

      {/* Weekdays */}
      <View style={[styles.weekRow, { marginBottom: theme.spacing.xs }]}>
        {fmtWeekday.map((wd, i) => (
          <Text
            key={i}
            style={[styles.weekText, { color: theme.textSecondary }]}
          >
            {wd.toUpperCase()}
          </Text>
        ))}
      </View>

      {/* Grid */}
      <View style={[styles.grid, { gap: 4 }]}>
        {cells.map((c, i) => {
          const selectedStart = isSameDay(c.date, selStart);
          const selectedEnd = isSameDay(c.date, selEnd);
          const selected = selectedStart || selectedEnd;
          const inSel = inRange(c.date, selStart, selEnd);
          const disabled = isDisabled(c.date);

          const textColor = c.inMonth ? theme.text : theme.textSecondary;
          const ringWidth =
            (focus === "start" && selectedStart) ||
            (focus === "end" && selectedEnd)
              ? 3
              : selected
              ? 2
              : 0;

          return (
            <Pressable
              key={i}
              onPress={() => !disabled && select(c.date)}
              disabled={disabled}
              style={[styles.cell, { opacity: disabled ? 0.4 : 1 }]}
            >
              <View style={styles.circleWrap}>
                {inSel && (
                  <View
                    style={[styles.rangeBg, { backgroundColor: theme.overlay }]}
                  />
                )}
                {selected && (
                  <View
                    style={[
                      styles.dotCircle,
                      { borderColor: theme.accent, borderWidth: ringWidth },
                    ]}
                  />
                )}
              </View>

              <Text
                style={{
                  color: textColor,
                  textAlign: "center",
                  fontSize: theme.typography.size.sm,
                }}
              >
                {c.date.getDate()}
              </Text>

              {isSameDay(c.date, today) && (
                <View
                  style={[styles.todayMark, { backgroundColor: theme.link }]}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  navBtn: { padding: 8 },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekText: { width: `${100 / 7}%`, textAlign: "center", fontSize: 12 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1, // kwadrat
    alignItems: "center",
    justifyContent: "center",
  },
  circleWrap: {
    position: "absolute",
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  rangeBg: {
    position: "absolute",
    width: "90%",
    height: "90%",
    borderRadius: 9999,
  },
  dotCircle: {
    position: "absolute",
    width: "85%",
    height: "85%",
    borderRadius: 9999,
  },
  todayMark: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
