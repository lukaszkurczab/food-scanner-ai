import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useTheme } from "@/theme/useTheme";
import { baseColors } from "@/theme/colors";

type MacroKey = "protein" | "fat" | "carbs";

type Props = {
  macro: MacroKey;
  targetGrams: number;
  consumedGrams: number;
};

type PieDatum = {
  value: number;
  color: string;
  label: string;
  opacity: number;
};

const SIZE = 90;
const OUTER_RADIUS = SIZE / 2;
const MIN_SHARE = 0.05;

const MACRO_COLORS: Record<
  MacroKey,
  {
    light: string;
    dark: string;
  }
> = {
  protein: {
    light: baseColors.blue,
    dark: baseColors.proteinDark,
  },
  fat: {
    light: baseColors.yellow,
    dark: baseColors.fatDark,
  },
  carbs: {
    light: baseColors.carbsLight,
    dark: baseColors.carbsDark,
  },
};

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

export function MacroTargetDonut({ macro, targetGrams, consumedGrams }: Props) {
  const theme = useTheme();

  const safeTarget = Math.max(targetGrams || 0, 0);
  const safeConsumed = Math.max(consumedGrams || 0, 0);

  if (safeTarget <= 0 && safeConsumed <= 0) {
    return null;
  }

  const remainingGrams = Math.max(safeTarget - safeConsumed, 0);
  const consumedClamped = Math.min(
    safeConsumed,
    safeTarget > 0 ? safeTarget : safeConsumed
  );

  const colors = MACRO_COLORS[macro];

  const data: PieDatum[] = [
    {
      label: "remaining",
      value: remainingGrams,
      color: colors.dark,
      opacity: 0.4,
    },
    {
      label: "consumed",
      value: consumedClamped,
      color: colors.light,
      opacity: 1,
    },
  ];

  const safeData: PieDatum[] = data.map((d) => ({
    ...d,
    value: Math.max(0, d.value),
  }));

  const cx = SIZE / 2;
  const cy = SIZE / 2;

  const values = safeData.map((d) => d.value);
  const shares = normalizeShares(values);

  const ratioRaw = 0.72;
  const ratio = Math.min(Math.max(ratioRaw, 0.5), 0.8);
  const innerR = OUTER_RADIUS * ratio;

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
      innerR,
      OUTER_RADIUS,
      startAngle,
      endAngle
    );

    return (
      <Path
        key={`${d.label}-${index}`}
        d={path}
        fill={d.color}
        opacity={d.opacity}
      />
    );
  });

  const remainingLabel = Math.round(remainingGrams);
  const textStyleBig = [
    styles.centerBig,
    {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
  ];
  const textStyleSmall = [
    styles.centerSmall,
    {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    },
  ];

  return (
    <View style={styles.wrap}>
      <View style={styles.chartContainer}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {slices}
        </Svg>
        <View style={styles.centerLabel}>
          <Text style={textStyleBig}>{remainingLabel}</Text>
          <Text style={textStyleSmall}>g</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
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
  centerBig: {
    fontSize: 16,
  },
  centerSmall: {
    fontSize: 10,
  },
});
