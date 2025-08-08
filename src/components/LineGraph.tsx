import React, { useState } from "react";
import { View, Text, StyleSheet, LayoutChangeEvent } from "react-native";
import {
  Svg,
  Line,
  Circle,
  G,
  Text as SvgText,
  Path,
  Defs,
  LinearGradient,
  Stop,
  Rect,
  ClipPath,
} from "react-native-svg";
import { useTheme } from "@/src/theme/useTheme";

type LineGraphProps = {
  data: number[];
  labels: string[];
  title?: string;
  stepY?: number;
  stepX?: number;
  height?: number;
  smooth?: boolean;
  approxYTicks?: number;
};

export const LineGraph = ({
  data,
  labels,
  title,
  stepY,
  stepX = 1,
  height = 120,
  smooth = true,
  approxYTicks = 4,
}: LineGraphProps) => {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const topPad = 22;
  const bottomPad = 16;
  const rightPad = 12;
  const yAxisWidth = 40;

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  const safeData = Array.isArray(data) && data.length ? data : [0];

  let rawMax = Math.max(...safeData);
  let rawMin = Math.min(...safeData);
  if (rawMax === rawMin) {
    rawMax += 1;
    rawMin -= 1;
  }

  function niceNum(range: number, round: boolean) {
    const exp = Math.floor(Math.log10(range));
    const f = range / Math.pow(10, exp);
    let nf: number;
    if (round) {
      if (f < 1.5) nf = 1;
      else if (f < 3) nf = 2;
      else if (f < 7) nf = 5;
      else nf = 10;
    } else {
      if (f <= 1) nf = 1;
      else if (f <= 2) nf = 2;
      else if (f <= 5) nf = 5;
      else nf = 10;
    }
    return nf * Math.pow(10, exp);
  }

  function niceScale(minVal: number, maxVal: number, maxTicks = 4) {
    const range = niceNum(maxVal - minVal, false);
    const spacing = niceNum(range / Math.max(1, maxTicks), true);
    const niceMin = Math.floor(minVal / spacing) * spacing;
    const niceMax = Math.ceil(maxVal / spacing) * spacing;
    return { niceMin, niceMax, spacing };
  }

  let yMin: number;
  let yMax: number;
  let yStep: number;

  if (stepY && stepY > 0) {
    yStep = stepY;
    yMin = Math.floor(rawMin / yStep) * yStep;
    yMax = Math.ceil(rawMax / yStep) * yStep;
  } else {
    const { niceMin, niceMax, spacing } = niceScale(
      rawMin,
      rawMax,
      approxYTicks
    );
    yMin = niceMin;
    yMax = niceMax;
    yStep = spacing;
  }

  const chartW = Math.max(1, width - yAxisWidth - rightPad);
  const chartH = height;

  const xAt = (i: number) =>
    yAxisWidth +
    chartW * (safeData.length <= 1 ? 0 : i / (safeData.length - 1));
  const yAt = (v: number) => {
    const range = Math.max(1, yMax - yMin);
    return topPad + chartH - ((v - yMin) / range) * chartH;
  };

  const pts = safeData.map((v, i) => ({ x: xAt(i), y: yAt(v), v }));

  function buildMonotonePath(points: { x: number; y: number }[]) {
    const n = points.length;
    if (n < 2) return "";
    if (n === 2)
      return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;

    const dx = Array(n - 1);
    const dy = Array(n - 1);
    const m = Array(n - 1);
    for (let i = 0; i < n - 1; i++) {
      dx[i] = points[i + 1].x - points[i].x;
      dy[i] = points[i + 1].y - points[i].y;
      m[i] = dy[i] / dx[i];
    }

    const t = Array(n);
    t[0] = m[0];
    t[n - 1] = m[n - 2];
    for (let i = 1; i < n - 1; i++) {
      t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
    }

    for (let i = 0; i < n - 1; i++) {
      if (m[i] === 0) {
        t[i] = 0;
        t[i + 1] = 0;
      } else {
        const a = t[i] / m[i];
        const b = t[i + 1] / m[i];
        const s = a * a + b * b;
        if (s > 9) {
          const tau = 3 / Math.sqrt(s);
          t[i] = tau * a * m[i];
          t[i + 1] = tau * b * m[i];
        }
      }
    }

    let d = `M${points[0].x},${points[0].y}`;
    for (let i = 0; i < n - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + dx[i] / 3;
      const cp1y = p0.y + (t[i] * dx[i]) / 3;
      const cp2x = p1.x - dx[i] / 3;
      const cp2y = p1.y - (t[i + 1] * dx[i]) / 3;
      d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }
    return d;
  }

  const hasEnoughPoints = pts.length >= 2;

  const linePath = hasEnoughPoints
    ? smooth
      ? buildMonotonePath(pts)
      : pts.reduce((acc, p, i) => acc + `${i ? "L" : "M"}${p.x},${p.y} `, "")
    : "";

  const clipId = "clipArea";
  const areaD = hasEnoughPoints
    ? linePath +
      ` L${yAxisWidth + chartW},${topPad + chartH} L${yAxisWidth},${
        topPad + chartH
      } Z`
    : "";

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-6; v += yStep) {
    yTicks.push(v);
  }

  const colW = chartW / Math.max(1, safeData.length - 1);
  const hitHalf = Math.max(20, colW / 2);

  const clampY = (y: number) => Math.max(topPad + 10, y - 8);

  return (
    <View style={styles.container} onLayout={onLayout}>
      {title && (
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      )}

      {width > 0 && (
        <Svg width={width} height={topPad + chartH + bottomPad}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.accent} stopOpacity={0.22} />
              <Stop offset="80%" stopColor={theme.accent} stopOpacity={0.03} />
            </LinearGradient>
            <ClipPath id={clipId}>
              <Rect x={yAxisWidth} y={topPad} width={chartW} height={chartH} />
            </ClipPath>
          </Defs>

          {yTicks.map((v, idx) => {
            const y = yAt(v);
            return (
              <G key={`yt-${idx}`}>
                <Line
                  x1={yAxisWidth}
                  y1={y}
                  x2={yAxisWidth + chartW}
                  y2={y}
                  stroke={theme.border}
                  strokeWidth={1}
                  opacity={0.35}
                />
                <SvgText
                  x={yAxisWidth - 6}
                  y={y + 3}
                  fontSize="10"
                  fill={theme.textSecondary}
                  textAnchor="end"
                >
                  {Math.round(v)}
                </SvgText>
              </G>
            );
          })}

          <Line
            x1={yAxisWidth}
            y1={topPad + chartH}
            x2={yAxisWidth + chartW}
            y2={topPad + chartH}
            stroke={theme.border}
            strokeWidth={1}
          />

          {hasEnoughPoints && (
            <Path
              d={areaD}
              fill="url(#areaGradient)"
              clipPath={`url(#${clipId})`}
            />
          )}

          {hasEnoughPoints && (
            <Path
              d={linePath}
              fill="none"
              stroke={theme.accent}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {pts.map((p, i) => (
            <G key={i}>
              <Rect
                x={Math.max(yAxisWidth, p.x - hitHalf)}
                y={topPad}
                width={hitHalf * 2}
                height={chartH}
                fill="transparent"
                onPress={() =>
                  setActiveIndex((prev) => (prev === i ? null : i))
                }
              />
              <Circle cx={p.x} cy={p.y} r={4} fill={theme.accent} />

              {activeIndex === i && (
                <SvgText
                  x={p.x}
                  y={clampY(p.y)}
                  fontSize="12"
                  fontWeight="bold"
                  fill={theme.textSecondary}
                  textAnchor="middle"
                >
                  {p.v}
                </SvgText>
              )}

              {i % stepX === 0 && (
                <SvgText
                  x={i === 0 ? p.x + 2 : i === pts.length - 1 ? p.x - 2 : p.x}
                  y={topPad + chartH + 14}
                  fontSize="10"
                  fill={theme.textSecondary}
                  textAnchor={
                    i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"
                  }
                >
                  {labels[i] ?? ""}
                </SvgText>
              )}
            </G>
          ))}
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20, overflow: "hidden", width: "100%" },
  title: { fontWeight: "bold", marginBottom: 8 },
});
