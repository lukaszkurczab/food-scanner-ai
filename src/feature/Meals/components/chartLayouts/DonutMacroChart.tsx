import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

type PieDatum = {
  value: number;
  color: string;
  label: string;
};

type Props = {
  data: PieDatum[];
  kcal: number;
  showKcalLabel?: boolean;
  showLegend?: boolean;
};

const SIZE = 180;
const OUTER_RADIUS = SIZE / 2;
const INNER_RADIUS_RATIO = 0.64;
const INNER_RADIUS = OUTER_RADIUS * INNER_RADIUS_RATIO;
const MIN_SHARE = 0.05; // 5%

const degToRad = (deg: number) => (deg * Math.PI) / 180;

function buildDonutSlicePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngleDeg: number,
  endAngleDeg: number
): string {
  const start = degToRad(startAngleDeg);
  const end = degToRad(endAngleDeg);

  const x1 = cx + outerR * Math.cos(start);
  const y1 = cy + outerR * Math.sin(start);
  const x2 = cx + outerR * Math.cos(end);
  const y2 = cy + outerR * Math.sin(end);

  const x3 = cx + innerR * Math.cos(end);
  const y3 = cy + innerR * Math.sin(end);
  const x4 = cx + innerR * Math.cos(start);
  const y4 = cy + innerR * Math.sin(start);

  const angleDelta = endAngleDeg - startAngleDeg;
  const largeArcFlag = angleDelta > 180 ? 1 : 0;

  return [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

function normalizeShares(values: number[]): number[] {
  const safe = values.map((v) => Math.max(0, v));
  const positives = safe.filter((v) => v > 0);

  if (positives.length === 0) {
    const equalShare = 1 / (safe.length || 1);
    return safe.map(() => equalShare);
  }

  const sum = positives.reduce((s, v) => s + v, 0);
  if (sum <= 0) {
    const equalShare = 1 / positives.length;
    return safe.map((v) => (v > 0 ? equalShare : 0));
  }

  const rawShares = safe.map((v) => (v > 0 ? v / sum : 0));
  const baseShares = rawShares.map((s) => (s > 0 ? Math.max(s, MIN_SHARE) : 0));
  const baseSum = baseShares.reduce((s, v) => s + v, 0);

  if (baseSum <= 0) {
    const equalShare = 1 / positives.length;
    return safe.map((v) => (v > 0 ? equalShare : 0));
  }

  return baseShares.map((s) => (s > 0 ? s / baseSum : 0));
}

export default function DonutMacroChart({
  data,
  kcal,
  showKcalLabel = true,
  showLegend = false,
}: Props) {
  const safeData: PieDatum[] = (data || []).map((d) => ({
    ...d,
    value: Math.max(0, d.value),
  }));

  const cx = SIZE / 2;
  const cy = SIZE / 2;

  if (!safeData.length) {
    return (
      <View style={styles.wrap}>
        {showKcalLabel && <Text style={styles.kcalText}>{kcal} kcal</Text>}
      </View>
    );
  }

  const values = safeData.map((d) => d.value);
  const shares = normalizeShares(values);

  let currentAngle = -90;
  const slices = safeData.map((d, index) => {
    const share = shares[index];
    if (share <= 0) {
      return null;
    }

    let angle = 360 * share;
    if (angle >= 360) {
      angle = 359.999;
    }

    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const path = buildDonutSlicePath(
      cx,
      cy,
      INNER_RADIUS,
      OUTER_RADIUS,
      startAngle,
      endAngle
    );

    return <Path key={`${d.label}-${index}`} d={path} fill={d.color} />;
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.chartContainer}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {slices}
        </Svg>
        {showKcalLabel && (
          <View style={styles.centerLabel}>
            <Text style={styles.kcalBig}>{kcal}</Text>
            <Text style={styles.kcalSmall}>kcal</Text>
          </View>
        )}
      </View>

      {showLegend && (
        <View style={styles.legendRow}>
          {safeData.map((d) => (
            <View key={d.label} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: d.color }]} />
              <Text style={styles.legendText}>
                {d.label}: {Math.round(d.value)} g
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 220,
    alignItems: "center",
  },
  chartContainer: {
    width: SIZE,
    height: SIZE,
    justifyContent: "center",
    alignItems: "center",
  },
  centerLabel: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  kcalBig: {
    fontSize: 18,
    fontWeight: "700",
  },
  kcalSmall: {
    fontSize: 11,
    opacity: 0.7,
  },
  kcalText: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
  },
  legendRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 4,
    marginVertical: 2,
  },
  legendText: {
    fontSize: 11,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
});
