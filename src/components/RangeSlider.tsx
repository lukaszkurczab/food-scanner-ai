import React, { useMemo } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";

type RangeSliderProps = {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
};

export const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
}) => {
  const theme = useTheme();
  const [lo, hi] = value;

  const pct = (n: number) => ((n - min) / (max - min)) * 100;

  const trackFillStyle = useMemo(
    () => ({
      left: `${Math.min(pct(lo), pct(hi))}%`,
      right: `${100 - Math.max(pct(lo), pct(hi))}%`,
      position: "absolute" as const,
      top: 0,
      bottom: 0,
      backgroundColor: theme.accentSecondary,
      borderRadius: 999,
    }),
    [lo, hi, min, max, theme.accentSecondary]
  );

  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const roundToStep = (n: number) => Math.round(n / step) * step;

  const setLo = (n: number) => {
    const next = clamp(roundToStep(n));
    onChange([Math.min(next, hi), hi]);
  };
  const setHi = (n: number) => {
    const next = clamp(roundToStep(n));
    onChange([lo, Math.max(next, lo)]);
  };

  const parse = (s: string) => {
    const n = parseFloat(String(s).replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  };

  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      {!!label && (
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.md,
            marginBottom: 6,
          }}
        >
          {label}
        </Text>
      )}

      <View
        style={{
          height: 8,
          backgroundColor: theme.border,
          borderRadius: 999,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <View style={trackFillStyle as any} />
      </View>

      <View
        style={{
          marginTop: 10,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setLo(lo - step)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Text style={{ color: theme.text }}>–</Text>
          </Pressable>
          <TextInput
            keyboardType="numeric"
            value={String(lo)}
            onChangeText={(s) => setLo(parse(s))}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: theme.text,
              backgroundColor: theme.background,
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setLo(lo + step)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Text style={{ color: theme.text }}>+</Text>
          </Pressable>
        </View>

        <Text style={{ color: theme.textSecondary, paddingHorizontal: 6 }}>
          to
        </Text>

        <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setHi(hi - step)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Text style={{ color: theme.text }}>–</Text>
          </Pressable>
          <TextInput
            keyboardType="numeric"
            value={String(hi)}
            onChangeText={(s) => setHi(parse(s))}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 10,
              paddingHorizontal: 10,
              paddingVertical: 8,
              color: theme.text,
              backgroundColor: theme.background,
            }}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setHi(hi + step)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 8,
              borderRadius: 10,
              borderWidth: 1,
              borderColor: theme.border,
              backgroundColor: theme.card,
            }}
          >
            <Text style={{ color: theme.text }}>+</Text>
          </Pressable>
        </View>
      </View>

      <View
        style={{
          marginTop: 6,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: theme.textSecondary }}>{min}</Text>
        <Text style={{ color: theme.textSecondary }}>{max}</Text>
      </View>
    </View>
  );
};
