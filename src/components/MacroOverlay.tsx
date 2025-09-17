import React from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  protein: number;
  fat: number;
  carbs: number;
  kcal: number;
  color?: string;
  backgroundColor?: string;
  variant?: "chips" | "bars";
};

export default function MacroOverlay({
  protein,
  fat,
  carbs,
  kcal,
  color,
  backgroundColor,
  variant = "chips",
}: Props) {
  const theme = useTheme();
  const textColor = color || String(theme.text);
  const bg = backgroundColor || "rgba(0,0,0,0.35)";

  const items = [
    {
      key: "Calories",
      label: "kcal",
      value: Math.max(0, Math.round(kcal)),
      tone: textColor,
      icon: undefined,
    },
    {
      key: "Protein",
      label: "g",
      value: Math.max(0, Math.round(protein)),
      tone: String(theme.macro.protein),
      icon: undefined,
    },
    {
      key: "Carbs",
      label: "g",
      value: Math.max(0, Math.round(carbs)),
      tone: String(theme.macro.carbs),
      icon: undefined,
    },
    {
      key: "Fat",
      label: "g",
      value: Math.max(0, Math.round(fat)),
      tone: String(theme.macro.fat),
      icon: undefined,
    },
  ];

  if (variant === "bars") {
    const totalG = Math.max(1, protein + carbs + fat);
    const pct = {
      Protein: (protein / totalG) * 100,
      Carbs: (carbs / totalG) * 100,
      Fat: (fat / totalG) * 100,
    } as const;

    return (
      <View style={[styles.wrap, { gap: 8 }]}>
        <View style={[styles.badge, { backgroundColor: bg }]}>
          <Text style={[styles.badgeText, { color: textColor }]}>
            {items[0].value} kcal
          </Text>
        </View>

        <View style={[styles.barTrack, { backgroundColor: bg }]}>
          <View
            style={[
              styles.barFill,
              {
                flexBasis: `${pct.Protein}%`,
                backgroundColor: theme.macro.protein,
              },
            ]}
          />
          <View
            style={[
              styles.barFill,
              {
                flexBasis: `${pct.Carbs}%`,
                backgroundColor: theme.macro.carbs,
              },
            ]}
          />
          <View
            style={[
              styles.barFill,
              { flexBasis: `${pct.Fat}%`, backgroundColor: theme.macro.fat },
            ]}
          />
        </View>

        <View style={styles.legendRow}>
          {items.slice(1).map((it) => (
            <View key={it.key} style={styles.legendItem}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: it.tone, borderColor: "rgba(0,0,0,0.25)" },
                ]}
              />
              <Text style={[styles.legendText, { color: textColor }]}>
                {it.key}: {it.value}
                {it.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.row, { backgroundColor: "transparent" }]}>
      {items.map((it) => (
        <View
          key={it.key}
          style={[
            styles.chip,
            {
              backgroundColor: bg,
              borderColor: it.key === "Calories" ? textColor : it.tone,
            },
          ]}
        >
          {it.icon ? (
            <Image
              source={it.icon}
              style={{
                width: 14,
                height: 14,
                marginRight: 6,
                tintColor: it.key === "Calories" ? textColor : it.tone,
              }}
            />
          ) : (
            <View
              style={[
                styles.dot,
                {
                  marginRight: 6,
                  backgroundColor: it.key === "Calories" ? textColor : it.tone,
                },
              ]}
            />
          )}
          <Text
            style={{
              color: it.key === "Calories" ? textColor : it.tone,
              fontWeight: "bold",
            }}
          >
            {it.key === "Calories"
              ? `${it.value} kcal`
              : `${it.key}: ${it.value}${it.label}`}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "stretch", minWidth: 220 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  badgeText: { fontWeight: "bold" },
  barTrack: {
    height: 12,
    borderRadius: 999,
    overflow: "hidden",
    flexDirection: "row",
  },
  barFill: { height: "100%" },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  legendItem: { flexDirection: "row", alignItems: "center" },
  legendText: { fontSize: 12 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
});
