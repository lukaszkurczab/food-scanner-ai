import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet } from "react-native";
import type { DimensionValue } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  uri?: string | null;
  width: DimensionValue;
  height: number;
  borderRadius?: number;
  onError?: () => void;
};

export const FallbackImage: React.FC<Props> = ({
  uri,
  width,
  height,
  borderRadius,
  onError,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [errored, setErrored] = useState(false);
  const imageStyle = useMemo(
    () => ({
      width,
      height,
      borderRadius: borderRadius ?? 16,
    }),
    [width, height, borderRadius],
  );

  useEffect(() => {
    setErrored(false);
  }, [uri]);

  if (!uri || errored) {
    return null;
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.image, imageStyle]}
      onError={() => {
        setErrored(true);
        onError?.();
      }}
      resizeMode="cover"
    />
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    image: {
      backgroundColor: theme.surfaceElevated,
    },
  });
