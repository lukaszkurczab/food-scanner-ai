import React, { useState } from "react";
import { View, Text, LayoutChangeEvent, StyleSheet } from "react-native";
import {
  Svg,
  Rect,
  Line,
  Text as SvgText,
  G,
  Defs,
  ClipPath,
  Rect as SvgRect,
} from "react-native-svg";
import { useTheme } from "@/theme/useTheme";

export type BarChartOrientation = "vertical" | "horizontal";

export type BarChartProps = {
  data: number[];
  labels: string[];
  orientation?: BarChartOrientation;
  maxHeight?: number;
  barColor?: string;
  barRadius?: number;
  barGap?: number;
  title?: string;
  approxYTicks?: number;
};

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
  return { step, yMin, yMax };
};

export const BarChart: React.FC<BarChartProps> = ({
  data,
  labels,
  orientation = "vertical",
  maxHeight = 140,
  barColor,
  barRadius = 4,
  barGap = 8,
  title,
  approxYTicks = 5,
}) => {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) =>
    setWidth(e.nativeEvent.layout.width);

  const safeData = Array.isArray(data) && data.length ? data : [0];
  const n = Math.min(safeData.length, labels.length || safeData.length);
  const values = safeData.slice(0, n);
  const names = labels.slice(0, n);

  let rawMax = Math.max(...values);
  let rawMin = Math.min(...values);
  if (rawMax === rawMin) {
    rawMax += 1;
    rawMin -= 1;
  }
  const yMaxNice = niceCeil(rawMax);
  const yMin0 = rawMin >= 0 ? 0 : -niceCeil(Math.abs(rawMin));
  const {
    step: yStep,
    yMin,
    yMax,
  } = clampTicksStep(yMin0, yMaxNice, Math.min(8, Math.max(4, approxYTicks)));

  const topPad = 22;
  const bottomPad = 22;
  const leftPad = 44;
  const rightPad = 12;

  const chartW = Math.max(1, width - leftPad - rightPad);
  const chartH = maxHeight;

  const yAt = (v: number) => {
    const range = Math.max(1e-9, yMax - yMin);
    return topPad + chartH - ((v - yMin) / range) * chartH;
  };

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 1e-9; v += yStep) {
    const rounded = Number((Math.round(v / yStep) * yStep).toPrecision(12));
    if (
      yTicks.length === 0 ||
      Math.abs(rounded - yTicks[yTicks.length - 1]) > 1e-9
    )
      yTicks.push(rounded);
  }

  const formatTick = (v: number) => {
    if (Number.isInteger(yStep)) return Math.round(v).toString();
    const dec = yStep < 0.1 ? 2 : 1;
    return v.toFixed(dec);
  };

  const color = barColor || theme.accent;

  const vertical = orientation === "vertical";
  const svgH = topPad + chartH + bottomPad;

  const barGeometryVertical = () => {
    const totalGap = Math.max(0, (n - 1) * barGap);
    const barW = n > 0 ? Math.max(1, (chartW - totalGap) / n) : chartW;
    return { barW };
  };

  const barGeometryHorizontal = () => {
    const totalGap = Math.max(0, (n - 1) * barGap);
    const barH = n > 0 ? Math.max(1, (chartH - totalGap) / n) : chartH;
    return { barH };
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      {title ? (
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      ) : null}
      {width > 0 && (
        <Svg width={width} height={svgH}>
          <Defs>
            <ClipPath id="clip-bars">
              <SvgRect x={leftPad} y={topPad} width={chartW} height={chartH} />
            </ClipPath>
          </Defs>

          {yTicks.map((v, idx) => {
            const y = yAt(v);
            return (
              <G key={`grid-${idx}`}>
                <Line
                  x1={leftPad}
                  y1={y}
                  x2={leftPad + chartW}
                  y2={y}
                  stroke={theme.border}
                  strokeWidth={1}
                  opacity={0.35}
                />
                <SvgText
                  x={leftPad - 6}
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
            x1={leftPad}
            y1={topPad + chartH}
            x2={leftPad + chartW}
            y2={topPad + chartH}
            stroke={theme.border}
            strokeWidth={1}
          />

          {vertical && (
            <G clipPath="url(#clip-bars)">
              {values.map((v, i) => {
                const { barW } = barGeometryVertical();
                const x = leftPad + i * (barW + barGap);
                const y = Math.min(yAt(v), topPad + chartH);
                const h = Math.max(0, topPad + chartH - y);
                return (
                  <G key={`barv-${i}`}>
                    <Rect
                      x={x}
                      y={y}
                      width={barW}
                      height={h}
                      rx={barRadius}
                      ry={barRadius}
                      fill={color}
                      onPress={() =>
                        setActiveIndex((prev) => (prev === i ? null : i))
                      }
                    />
                  </G>
                );
              })}
            </G>
          )}

          {!vertical && (
            <G clipPath="url(#clip-bars)">
              {values.map((v, i) => {
                const { barH } = barGeometryHorizontal();
                const y = topPad + i * (barH + barGap);
                const x0 = leftPad;
                const x1 =
                  leftPad +
                  Math.max(
                    0,
                    ((v - yMin) / Math.max(1e-9, yMax - yMin)) * chartW
                  );
                const w = Math.max(0, x1 - x0);
                return (
                  <G key={`barh-${i}`}>
                    <Rect
                      x={x0}
                      y={y}
                      width={w}
                      height={barH}
                      rx={barRadius}
                      ry={barRadius}
                      fill={color}
                      onPress={() =>
                        setActiveIndex((prev) => (prev === i ? null : i))
                      }
                    />
                  </G>
                );
              })}
            </G>
          )}

          {vertical &&
            values.map((_, i) => {
              const { barW } = barGeometryVertical();
              const x = leftPad + i * (barW + barGap) + barW / 2;
              return (
                <SvgText
                  key={`lx-${i}`}
                  x={x}
                  y={topPad + chartH + 14}
                  fontSize="10"
                  fill={theme.textSecondary}
                  textAnchor="middle"
                >
                  {names[i] ?? ""}
                </SvgText>
              );
            })}

          {!vertical &&
            values.map((_, i) => {
              const { barH } = barGeometryHorizontal();
              const y = topPad + i * (barH + barGap) + barH / 2 + 3;
              return (
                <SvgText
                  key={`ly-${i}`}
                  x={leftPad - 6}
                  y={y}
                  fontSize="10"
                  fill={theme.textSecondary}
                  textAnchor="end"
                >
                  {names[i] ?? ""}
                </SvgText>
              );
            })}

          {activeIndex !== null &&
            vertical &&
            (() => {
              const { barW } = barGeometryVertical();
              const v = values[activeIndex];
              const x = leftPad + activeIndex * (barW + barGap) + barW / 2;
              const y = yAt(v) - 6;
              return (
                <SvgText
                  x={x}
                  y={y}
                  fontSize="12"
                  fontWeight="bold"
                  fill={theme.textSecondary}
                  textAnchor="middle"
                >
                  {v}
                </SvgText>
              );
            })()}

          {activeIndex !== null &&
            !vertical &&
            (() => {
              const { barH } = barGeometryHorizontal();
              const v = values[activeIndex];
              const y = topPad + activeIndex * (barH + barGap) + barH / 2 + 4;
              const x =
                leftPad +
                Math.max(
                  0,
                  ((v - yMin) / Math.max(1e-9, yMax - yMin)) * chartW
                ) +
                6;
              return (
                <SvgText
                  x={x}
                  y={y}
                  fontSize="12"
                  fontWeight="bold"
                  fill={theme.textSecondary}
                  textAnchor="start"
                >
                  {v}
                </SvgText>
              );
            })()}
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 20, overflow: "hidden", width: "100%" },
  title: { fontWeight: "bold", marginBottom: 8 },
});

export default BarChart;
