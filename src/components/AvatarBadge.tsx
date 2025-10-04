import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import type { Badge } from "@/types/badge";
import { useTheme } from "@/theme/useTheme";

type Props = {
  size?: number;
  uri?: string | null;
  badges: Badge[];
  fallbackIcon?: React.ReactNode;
  accessibilityLabel?: string;
  overrideColor?: string;
  overrideEmoji?: string;
};

function rank(b: Badge): number {
  const r: Record<string, number> = {
    premium_start: 50,
    premium_90d: 60,
    premium_365d: 70,
    premium_730d: 80,
    streak_7: 10,
    streak_30: 20,
    streak_90: 30,
    streak_180: 35,
    streak_365: 40,
    streak_500: 41,
    streak_1000: 45,
  };
  return r[b.id] ?? 0;
}

function pickBadge(badges: Badge[] | null | undefined): Badge | null {
  if (!badges || badges.length === 0) return null;
  return badges.slice().sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

export default function AvatarBadge({
  size = 96,
  uri,
  badges,
  fallbackIcon,
  accessibilityLabel,
  overrideColor,
  overrideEmoji,
}: Props) {
  const theme = useTheme();
  const sel = pickBadge(badges);
  const borderColor = overrideColor ?? sel?.color ?? theme.border;
  const emoji = overrideEmoji ?? sel?.icon ?? null;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor,
          backgroundColor: theme.card,
        },
      ]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{
            width: size - 6,
            height: size - 6,
            borderRadius: (size - 6) / 2,
          }}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size - 6, height: size - 6, borderRadius: (size - 6) / 2 },
          ]}
        >
          {fallbackIcon ?? null}
        </View>
      )}

      {emoji ? (
        <View
          style={[
            styles.badgeDot,
            {
              width: Math.max(22, Math.floor(size * 0.24)),
              height: Math.max(22, Math.floor(size * 0.24)),
              borderRadius: Math.max(11, Math.floor(size * 0.12)),
              backgroundColor: theme.card,
              borderColor,
            },
          ]}
        >
          <Text style={{ fontSize: Math.max(12, Math.floor(size * 0.14)) }}>
            {emoji}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
  },
  fallback: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  badgeDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
