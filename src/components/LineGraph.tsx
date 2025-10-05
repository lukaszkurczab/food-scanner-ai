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
import { useTheme } from "@/theme/useTheme";

type LineGraphProps = {
  data: number[];
  labels: string[];
  title?: string;
  stepY?: number;
  stepX?: number;
  height?: number;
  smooth?: boolean;
  approxYTicks?: number;
  color?: string;
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
  color,
}: LineGraphProps) => {
  const theme = useTheme();
  const strokeColor = color || String(theme.accent);
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

  const niceCeil = (v: number) => {
    const a = Math.abs(v) || 1;
    const exp = Math.floor(Math.log10(a));
    const base = Math.pow(10, exp);
    const f = a / base;
    const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return Math.sign(v || 1) * n * base;
  };

  const niceStep = (range: number, targetTicks: number) => {
    const raw = range / Math.max(1, targetTicks);
    const exp = Math.floor(Math.log10(raw));
    const base = Math.pow(10, exp);
    const f = raw / base;
    const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return n * base;
  };

  const clampTicksStep = (
    yMin0: number,
    yMax0: number,
    targetTicks: number,
    minTicks = 4,
    maxTicks = 8
  ) => {
    let step = niceStep(yMax0 - yMin0, targetTicks);
    let yMin = Math.floor(yMin0 / step) * step;
    let yMax = Math.ceil(yMax0 / step) * step;
    let intervals = Math.round((yMax - yMin) / step);

    for (
      let i = 0;
      i < 12 && (intervals < minTicks || intervals > maxTicks);
      i++
    ) {
      if (intervals < minTicks) step = step / 2;
      else step = step * 2;

      yMin = Math.floor(yMin0 / step) * step;
      yMax = Math.ceil(yMax0 / step) * step;
      intervals = Math.round((yMax - yMin) / step);
    }

    return { step, yMin, yMax, intervals };
  };

  // korekta zakresu:
  // - jeśli wszystkie wartości są równe 0 -> [0, 1]
  // - jeśli seria jest nieujemna i płaska -> [0, niceCeil(max || 1)]
  if (rawMax === rawMin) {
    if (rawMax <= 0) {
      rawMin = 0;
      rawMax = 1;
    } else {
      rawMin = 0;
      rawMax = niceCeil(rawMax);
    }
  }

  const yMaxNice = niceCeil(rawMax);
  let yMin0: number;
  let yMax0: number;

  if (rawMin >= 0) {
    yMin0 = 0;
    yMax0 = yMaxNice || 1;
  } else {
    yMin0 = -niceCeil(Math.abs(rawMin));
    yMax0 = yMaxNice;
  }

  let yMin: number;
  let yMax: number;
  let yStep: number;

  if (stepY && stepY > 0) {
    yStep = stepY;
    yMin = Math.floor(yMin0 / yStep) * yStep;
    yMax = Math.ceil(yMax0 / yStep) * yStep;
  } else {
    const {
      step,
      yMin: m,
      yMax: M,
    } = clampTicksStep(yMin0, yMax0, Math.min(8, Math.max(4, approxYTicks)));
    yStep = step;
    yMin = m;
    yMax = M;
  }

  const chartW = Math.max(1, width - yAxisWidth - rightPad);
  const chartH = height;

  const xAt = (i: number) =>
    yAxisWidth +
    chartW * (safeData.length <= 1 ? 0 : i / (safeData.length - 1));
  const yAt = (v: number) => {
    const range = Math.max(1e-9, yMax - yMin);
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
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) {
    const rounded = Number((Math.round(v / yStep) * yStep).toPrecision(12));
    if (
      yTicks.length === 0 ||
      Math.abs(rounded - yTicks[yTicks.length - 1]) > 1e-9
    ) {
      yTicks.push(rounded);
    }
  }

  const colW = chartW / Math.max(1, safeData.length - 1);
  const hitHalf = Math.max(20, colW / 2);
  const clampY = (y: number) => Math.max(topPad + 10, y - 8);

  const formatTick = (v: number) => {
    if (Number.isInteger(yStep)) return Math.round(v).toString();
    const dec = yStep < 0.1 ? 2 : 1;
    return v.toFixed(dec);
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {title && (
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      )}

      {width > 0 && (
        <Svg width={width} height={topPad + chartH + bottomPad}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.22} />
              <Stop offset="80%" stopColor={strokeColor} stopOpacity={0.03} />
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
                  {formatTick(v)}
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
              d={linePath}
              fill="none"
              stroke={strokeColor}
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
              <Circle cx={p.x} cy={p.y} r={4} fill={strokeColor} />

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
