import { View, Text, StyleSheet } from "react-native";
import type { MacroCardProps } from "../CardOverlay";
import {
  OverlayKcalBlock,
  OverlayMacroLegendItem,
} from "../overlayPrimitives";

export default function MacroSummaryCard({
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

  const macroItems = [
    { key: "protein", label: "P", value: protein, color: macroColors.protein },
    { key: "carbs", label: "C", value: carbs, color: macroColors.carbs },
    { key: "fat", label: "F", value: fat, color: macroColors.fat },
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
          align="center"
          tone="hero"
        />
      )}
      {showMacros && (
        <View style={[styles.row, showKcal ? styles.rowWithKcal : null]}>
          {macroItems.map((item) => (
            <OverlayMacroLegendItem
              key={item.key}
              label={item.label}
              value={item.value}
              color={item.color}
              textColor={textColor}
              fontFamily={effectiveFontFamily}
              fontWeight={effectiveFontWeight}
              align="center"
              compact
              style={styles.macroItem}
            />
          ))}
        </View>
      )}
      {!showMacros && showKcal ? (
        <Text
          style={[
            styles.subtitle,
            {
              color: textColor,
              fontFamily: effectiveFontFamily,
              fontWeight: effectiveFontWeight,
            },
          ]}
        >
          Meal summary
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    gap: 8,
  },
  rowWithKcal: {
    marginTop: 8,
  },
  macroItem: {
    flex: 1,
    minWidth: 48,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.72,
  },
});
