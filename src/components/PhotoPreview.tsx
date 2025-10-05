import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Image as RNImage,
  ActivityIndicator,
  LayoutChangeEvent,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as ImageManipulator from "expo-image-manipulator";

type PhotoPreviewProps = {
  photoUri: string;
  onRetake: () => void;
  onAccept: (optimizedUri: string) => void;
  isLoading?: boolean;
  primaryText: string;
  secondaryText: string;
};

const FRAME_RATIO = 4 / 3;

export const PhotoPreview = ({
  photoUri,
  onRetake,
  onAccept,
  isLoading = false,
  primaryText,
  secondaryText,
}: PhotoPreviewProps) => {
  const theme = useTheme();

  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [frameW, setFrameW] = useState(0);
  const [frameH, setFrameH] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [cropMode, setCropMode] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const stx = useSharedValue(0);
  const sty = useSharedValue(0);
  const minScale = useSharedValue(1);

  useEffect(() => {
    setLoadError(false);
    if (!photoUri) return;
    RNImage.getSize(photoUri, (w, h) => {
      setImgW(w);
      setImgH(h);
    });
  }, [photoUri]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    const h = Math.round(w / FRAME_RATIO);
    setFrameW(w);
    setFrameH(h);
  };

  const fitCover = () => {
    if (!imgW || !imgH || !frameW || !frameH) return;
    const s = Math.max(frameW / imgW, frameH / imgH);
    minScale.value = s;
    scale.value = withTiming(s);
    tx.value = withTiming(0);
    ty.value = withTiming(0);
  };

  useEffect(() => {
    fitCover();
  }, [imgW, imgH, frameW, frameH]);

  const clamp = (v: number, min: number, max: number) => {
    "worklet";
    return v < min ? min : v > max ? max : v;
  };

  const pan = Gesture.Pan()
    .enabled(cropMode)
    .onBegin(() => {
      stx.value = tx.value;
      sty.value = ty.value;
    })
    .onUpdate((e) => {
      const w = imgW * scale.value;
      const h = imgH * scale.value;
      const maxX = Math.max((w - frameW) / 2, 0);
      const maxY = Math.max((h - frameH) / 2, 0);
      tx.value = clamp(stx.value + e.translationX, -maxX, maxX);
      ty.value = clamp(sty.value + e.translationY, -maxY, maxY);
    });

  const pinch = Gesture.Pinch()
    .enabled(cropMode)
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const s = clamp(savedScale.value * e.scale, minScale.value, 6);
      scale.value = s;
      const w = imgW * s;
      const h = imgH * s;
      const maxX = Math.max((w - frameW) / 2, 0);
      const maxY = Math.max((h - frameH) / 2, 0);
      tx.value = clamp(tx.value, -maxX, maxX);
      ty.value = clamp(ty.value, -maxY, maxY);
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const aStyle = useAnimatedStyle(() => ({
    width: imgW,
    height: imgH,
    transform: [
      { scale: scale.value },
      { translateX: tx.value },
      { translateY: ty.value },
    ],
  }));

  const computeCrop = () => {
    const s = scale.value;
    const w = imgW * s;
    const h = imgH * s;
    const left = (frameW - w) / 2 + tx.value;
    const top = (frameH - h) / 2 + ty.value;
    const visLeft = Math.max(0 - left, 0);
    const visTop = Math.max(0 - top, 0);
    const visRight = Math.min(frameW - left, w);
    const visBottom = Math.min(frameH - top, h);
    const cropW = Math.max(0, visRight - visLeft);
    const cropH = Math.max(0, visBottom - visTop);
    return {
      originX: visLeft / s,
      originY: visTop / s,
      width: cropW / s,
      height: cropH / s,
    };
  };

  const handleAccept = async () => {
    const { originX, originY, width, height } = computeCrop();
    const actions: ImageManipulator.Action[] = [
      { crop: { originX, originY, width, height } },
      { resize: { width: Math.min(1280, Math.round(width)) } },
    ];
    try {
      const res = await ImageManipulator.manipulateAsync(photoUri, actions, {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      onAccept(res.uri);
    } catch {
      onAccept(photoUri);
    }
  };

  const reset = () => fitCover();

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      onLayout={onLayout}
    >
      <View style={[styles.frame, { width: frameW, height: frameH }]}>
        <GestureDetector gesture={composed}>
          <View style={styles.clip}>
            {!loadError ? (
              <Animated.Image
                source={{ uri: photoUri }}
                style={[styles.img, aStyle]}
                resizeMode="cover"
                onError={() => setLoadError(true)}
              />
            ) : null}
          </View>
        </GestureDetector>

        {/* Ramka z siatką i znacznikami */}
        {cropMode && (
          <View pointerEvents="none" style={styles.overlay}>
            <View style={styles.grid}>
              {Array.from({ length: 2 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.lineV, { left: `${(i + 1) * 33.33}%` }]}
                />
              ))}
              {Array.from({ length: 2 }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.lineH, { top: `${(i + 1) * 33.33}%` }]}
                />
              ))}
            </View>

            {/* znaczniki narożników */}
            <View style={[styles.corner, styles.tl]} />
            <View style={[styles.corner, styles.tr]} />
            <View style={[styles.corner, styles.bl]} />
            <View style={[styles.corner, styles.br]} />
          </View>
        )}
      </View>

      <View style={styles.toolbar}>
        <Pressable
          onPress={() => setCropMode((v) => !v)}
          style={[styles.toolBtn, { borderColor: theme.border }]}
        >
          <Text style={[styles.toolText, { color: theme.text }]}>
            {cropMode ? "Zakończ przycinanie" : "Przytnij"}
          </Text>
        </Pressable>
        <Pressable
          onPress={reset}
          style={[styles.toolBtn, { borderColor: theme.border }]}
        >
          <Text style={[styles.toolText, { color: theme.text }]}>Reset</Text>
        </Pressable>
      </View>

      <Pressable
        onPress={onRetake}
        disabled={isLoading}
        style={[
          styles.button,
          {
            backgroundColor: "transparent",
            borderColor: theme.accentSecondary,
            borderWidth: 1,
            opacity: isLoading ? 0.6 : 1,
          },
        ]}
      >
        <Text
          style={[styles.buttonText, { color: theme.text, fontWeight: "bold" }]}
        >
          {secondaryText}
        </Text>
      </Pressable>

      <Pressable
        onPress={handleAccept}
        disabled={isLoading}
        style={[
          styles.button,
          {
            backgroundColor: theme.accentSecondary,
            borderColor: "transparent",
            opacity: isLoading ? 0.6 : 1,
          },
        ]}
      >
        {isLoading ? (
          <ActivityIndicator color={theme.onAccent} />
        ) : (
          <Text
            style={[
              styles.buttonText,
              { color: theme.onAccent, fontWeight: "bold" },
            ]}
          >
            {primaryText}
          </Text>
        )}
      </Pressable>
    </View>
  );
};

const RADIUS = 28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  frame: {
    borderRadius: RADIUS,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 16,
  },
  clip: { flex: 1, alignItems: "center", justifyContent: "center" },
  img: { position: "absolute" },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    borderColor: "#FFF8",
    borderWidth: 1,
  },
  grid: { ...StyleSheet.absoluteFillObject },
  lineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "#FFF4",
  },
  lineH: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#FFF4",
  },

  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "#FFF",
  },
  tl: { top: 0, left: 0, borderTopWidth: 2, borderLeftWidth: 2 },
  tr: { top: 0, right: 0, borderTopWidth: 2, borderRightWidth: 2 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 2, borderLeftWidth: 2 },
  br: { bottom: 0, right: 0, borderBottomWidth: 2, borderRightWidth: 2 },

  toolbar: { width: "100%", flexDirection: "row", gap: 8, marginBottom: 16 },
  toolBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: { fontSize: 14 },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buttonText: { fontSize: 20 },
});
