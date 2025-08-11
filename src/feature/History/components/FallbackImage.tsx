import React, { useState } from "react";
import { Image, View, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  uri?: string | null;
  width: number | string;
  height: number;
  borderRadius?: number;
};

export const FallbackImage: React.FC<Props> = ({
  uri,
  width,
  height,
  borderRadius,
}) => {
  const theme = useTheme();
  const [error, setError] = useState(!uri);
  if (error) {
    return (
      <View
        style={[
          styles.fallback,
          {
            width,
            height,
            borderRadius: borderRadius ?? 16,
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
        ]}
      />
    );
  }

  if (!uri)
    return (
      <MaterialIcons name="add-a-photo" size={44} color={theme.textSecondary} />
    );
  return (
    <Image
      source={{ uri: uri as string }}
      style={{
        width,
        height,
        borderRadius: borderRadius ?? 16,
        backgroundColor: theme.card,
      }}
      onError={() => setError(true)}
      resizeMode="cover"
    />
  );
};

const styles = StyleSheet.create({
  fallback: { borderWidth: 1 },
});
