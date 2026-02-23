import React, { useEffect, useState } from "react";
import { Image } from "react-native";
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
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    setErrored(false);
  }, [uri]);

  if (!uri || errored) {
    return null;
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width,
        height,
        borderRadius: borderRadius ?? 16,
        backgroundColor: theme.card,
      }}
      onError={() => {
        setErrored(true);
        onError?.();
      }}
      resizeMode="cover"
    />
  );
};
