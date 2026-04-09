import { View, Text, StyleSheet } from "react-native";
import type { MacroCardProps } from "../CardOverlay";
import { OverlayKcalBlock, withAlpha } from "../overlayPrimitives";

export default function MacroVerticalStackCard({
  protein,
  fat,
  carbs,
  kcal,
  textColor,
  macroColors,
  showKcal,
  showMacros,
  fontFamily,
  fontWeight,
}: MacroCardProps) {
  const effectiveFontFamily = fontFamily ?? undefined;
  const effectiveFontWeight = fontWeight ?? "500";

  const rows = [
    { label: "Protein", value: protein, color: macroColors.protein },
    { label: "Carbs", value: carbs, color: macroColors.carbs },
    { label: "Fat", value: fat, color: macroColors.fat },
  ];

  if (!showKcal && !showMacros) {
    return null;
  }

  return (
    <View style={styles.card}>
      {showKcal && (
        <OverlayKcalBlock
          kcal={kcal}
          textColor={textColor}
          fontFamily={effectiveFontFamily}
          fontWeight={effectiveFontWeight}
          align="left"
          tone="title"
          subtitle="Meal"
        />
      )}
      {showMacros && (
        <View style={[styles.list, showKcal ? styles.listWithKcal : null]}>
          {rows.map((r) => (
            <View key={r.label} style={styles.row}>
              <View style={[styles.marker, { backgroundColor: withAlpha(r.color, 0.62) }]} />
              <Text
                style={[
                  styles.rowLabel,
                  {
                    color: withAlpha(textColor, 0.78),
                    fontFamily: effectiveFontFamily,
                    fontWeight: effectiveFontWeight,
                  },
                ]}
              >
                {r.label}
              </Text>
              <Text
                style={[
                  styles.rowValue,
                  {
                    color: textColor,
                    fontFamily: effectiveFontFamily,
                    fontWeight: effectiveFontWeight,
                  },
                ]}
              >
                {Math.round(r.value)}g
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "stretch",
    minWidth: 120,
  },
  list: { gap: 5 },
  listWithKcal: {
    marginTop: 8,
  },
  row: { flexDirection: "row", alignItems: "center" },
  marker: { width: 3, height: 11, borderRadius: 2, marginRight: 7 },
  rowLabel: { fontSize: 12, lineHeight: 15, flex: 1 },
  rowValue: { fontSize: 12, lineHeight: 15, fontWeight: "700" },
});
