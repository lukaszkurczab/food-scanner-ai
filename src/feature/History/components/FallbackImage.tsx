import React, { useEffect, useState } from "react";
import { Image } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import { ensureLocalMealPhoto } from "@/services/mealService.images";

type MinimalMealRef = {
  userUid: string;
  cloudId?: string | null;
  imageId?: string | null;
  photoUrl?: string | null;
};

type Props = {
  uri?: string | null;
  width: number | string;
  height: number;
  borderRadius?: number;
  onError?: () => void;
  mealRef?: MinimalMealRef;
};

export const FallbackImage: React.FC<Props> = ({
  uri,
  width,
  height,
  borderRadius,
  onError,
  mealRef,
}) => {
  const theme = useTheme();
  const [resolvedUri, setResolvedUri] = useState<string | null>(uri ?? null);
  const [error, setError] = useState(!uri);

  useEffect(() => {
    let cancelled = false;
    async function recoverIfMissing() {
      const u = resolvedUri;
      if (!u && mealRef?.userUid) {
        const local = await ensureLocalMealPhoto({
          uid: mealRef.userUid,
          cloudId: mealRef.cloudId ?? null,
          imageId: mealRef.imageId ?? null,
          photoUrl: mealRef.photoUrl ?? null,
        });
        if (!cancelled) {
          if (local) {
            setResolvedUri(local);
            setError(false);
          } else {
            setError(true);
          }
        }
        return;
      }
      if (u && (u.startsWith("file:") || u.startsWith("content:"))) {
        try {
          const info = await FileSystem.getInfoAsync(u);
          if (!info.exists && mealRef?.userUid) {
            const local = await ensureLocalMealPhoto({
              uid: mealRef.userUid,
              cloudId: mealRef.cloudId ?? null,
              imageId: mealRef.imageId ?? null,
              photoUrl: mealRef.photoUrl ?? null,
            });
            if (!cancelled) {
              if (local) {
                setResolvedUri(local);
                setError(false);
              } else {
                setError(true);
              }
            }
          }
        } catch {
          if (mealRef?.userUid) {
            const local = await ensureLocalMealPhoto({
              uid: mealRef.userUid,
              cloudId: mealRef.cloudId ?? null,
              imageId: mealRef.imageId ?? null,
              photoUrl: mealRef.photoUrl ?? null,
            });
            if (!cancelled) {
              if (local) {
                setResolvedUri(local);
                setError(false);
              } else {
                setError(true);
              }
            }
          } else {
            if (!cancelled) setError(true);
          }
        }
      }
    }
    recoverIfMissing();
    return () => {
      cancelled = true;
    };
  }, [
    resolvedUri,
    mealRef?.userUid,
    mealRef?.cloudId,
    mealRef?.imageId,
    mealRef?.photoUrl,
  ]);

  useEffect(() => {
    setResolvedUri(uri ?? null);
    setError(!uri);
  }, [uri]);

  if (error) return null;

  if (!resolvedUri)
    return (
      <MaterialIcons name="add-a-photo" size={44} color={theme.textSecondary} />
    );

  const handleError = () => {
    setError(true);
    onError?.();
  };

  return (
    <Image
      source={{ uri: resolvedUri }}
      style={{
        width: width as any,
        height,
        borderRadius: borderRadius ?? 16,
        backgroundColor: theme.card,
      }}
      onError={handleError}
      resizeMode="cover"
    />
  );
};

export default FallbackImage;
