import React, { useEffect, useState } from "react";
import { Image } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  uri?: string | null;
  width: number | string;
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
    return (
      <MaterialIcons name="add-a-photo" size={44} color={theme.textSecondary} />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={{
        width: width as any,
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
