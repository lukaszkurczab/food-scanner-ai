import React, { useEffect, useMemo, useState } from "react";
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

const isLocalUri = (value: string) =>
  value.startsWith("file://") || value.startsWith("content://");

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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [isLoaded, setIsLoaded] = useState(() =>
    uri ? isLocalUri(uri) : false,
  );
  const [hasError, setHasError] = useState(false);
  const sel = pickBadge(badges);
  const borderColor = overrideColor ?? sel?.color ?? theme.border;
  const emoji = overrideEmoji ?? sel?.icon ?? null;
  const avatarSize = size - 6;
  const hasUri = !!uri;
  const showImage = hasUri && !hasError;
  const showFallback = !showImage || !isLoaded;

  useEffect(() => {
    let cancelled = false;
    setHasError(false);

    if (!uri) {
      setIsLoaded(false);
      return () => {
        cancelled = true;
      };
    }

    if (isLocalUri(uri)) {
      setIsLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    setIsLoaded(false);

    if (typeof Image.queryCache === "function") {
      Image.queryCache([uri])
        .then((cache) => {
          if (cancelled) return;
          if (cache?.[uri]) {
            setIsLoaded(true);
          }
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [uri]);

  const wrapStyle = useMemo(
    () => ({
      width: size,
      height: size,
      borderRadius: size / 2,
      borderColor,
    }),
    [size, borderColor],
  );

  const avatarStyle = useMemo(
    () => ({
      width: avatarSize,
      height: avatarSize,
      borderRadius: avatarSize / 2,
    }),
    [avatarSize],
  );

  const badgeSize = Math.max(22, Math.floor(size * 0.24));
  const badgeRadius = Math.max(11, Math.floor(size * 0.12));

  const badgeDotStyle = useMemo(
    () => ({
      width: badgeSize,
      height: badgeSize,
      borderRadius: badgeRadius,
      borderColor,
    }),
    [badgeSize, badgeRadius, borderColor],
  );

  const emojiStyle = useMemo(
    () => ({
      fontSize: Math.max(12, Math.floor(size * 0.14)),
    }),
    [size],
  );

  return (
    <View
      style={[styles.wrap, wrapStyle]}
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <View style={[styles.avatarFrame, avatarStyle]}>
        {showFallback ? (
          <View style={styles.fallback}>{fallbackIcon ?? null}</View>
        ) : null}

        {showImage ? (
          <Image
            source={{ uri }}
            style={[styles.image, !isLoaded && styles.imageHidden]}
            onLoad={() => setIsLoaded(true)}
            onError={() => {
              setHasError(true);
              setIsLoaded(false);
            }}
          />
        ) : null}
      </View>

      {emoji ? (
        <View style={[styles.badgeDot, badgeDotStyle]}>
          <Text style={emojiStyle}>{emoji}</Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    wrap: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      backgroundColor: theme.surface,
    },
    avatarFrame: {
      overflow: "hidden",
      backgroundColor: theme.surfaceAlt,
    },
    image: {
      width: "100%",
      height: "100%",
    },
    imageHidden: {
      opacity: 0,
    },
    fallback: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceAlt,
    },
    badgeDot: {
      position: "absolute",
      right: -2,
      bottom: -2,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: StyleSheet.hairlineWidth,
      backgroundColor: theme.surfaceElevated,
    },
  });
