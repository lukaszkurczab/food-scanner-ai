import { View, Text, StyleSheet } from "react-native";
import { useTranslation } from "react-i18next";
import type { MacroCardProps } from "../CardOverlay";

export default function MacroBadgeCard({
  protein,
  fat,
  carbs,
  kcal,
  textColor,
  bgColor,
  showKcal,
  showMacros,
  fontFamily,
  fontWeight,
}: MacroCardProps) {
  const { t } = useTranslation(["meals", "share"]);
  const effectiveFontFamily = fontFamily ?? undefined;
  const effectiveFontWeight = fontWeight ?? "700";

  const total = Math.max(1, protein + carbs + fat);
  const pShare = protein / total;
  const label = pShare >= 0.3
    ? t("share:cardLabels.high_protein")
    : t("share:cardLabels.balanced_macros");

  return (
    <View style={styles.wrap}>
      <View style={[styles.badge, { backgroundColor: bgColor }]}>
        <Text
          style={[
            styles.badgeText,
            {
              color: textColor,
              fontFamily: effectiveFontFamily,
              fontWeight: effectiveFontWeight,
            },
          ]}
        >
          {label}
        </Text>
      </View>
      {showKcal && (
        <Text
          style={[
            styles.kcal,
            {
              color: textColor,
              fontFamily: effectiveFontFamily,
              fontWeight: effectiveFontWeight,
            },
          ]}
        >
          {kcal} kcal
        </Text>
      )}
      {showMacros && (
        <Text
          style={[
            styles.details,
            {
              color: textColor,
              fontFamily: effectiveFontFamily,
              fontWeight: effectiveFontWeight,
            },
          ]}
        >
          {t("meals:protein_short")} {protein} g • {t("meals:carbs_short")} {carbs} g • {t("meals:fat_short")} {fat} g
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "transparent",
    alignItems: "flex-start",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },
  kcal: { marginTop: 4, fontWeight: "700", fontSize: 16 },
  details: { marginTop: 2, fontSize: 12 },
});
