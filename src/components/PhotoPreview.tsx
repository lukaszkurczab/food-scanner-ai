import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image as RNImage,
  LayoutChangeEvent,
  Dimensions,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as ImageManipulator from "expo-image-manipulator";
import { useTranslation } from "react-i18next";
import { PrimaryButton } from "./PrimaryButton";
import { SecondaryButton } from "./SecondaryButton";
import { MaterialIcons } from "@expo/vector-icons";
import ZoomModal from "./ZoomModal";

type PhotoPreviewProps = {
  photoUri: string;
  onRetake: () => void;
  onAccept: (optimizedUri: string) => void;
  isLoading?: boolean;
  primaryText: string;
  secondaryText: string;
};

export const PhotoPreview = ({
  photoUri: initialUri,
  onRetake,
  onAccept,
  isLoading = false,
  primaryText,
  secondaryText,
}: PhotoPreviewProps) => {
  const theme = useTheme();
  const { t } = useTranslation("meals");

  const [photoUri, setPhotoUri] = useState(initialUri);
  const [originalUri, setOriginalUri] = useState<string | null>(null);
  const [imgW, setImgW] = useState(0);
  const [imgH, setImgH] = useState(0);
  const [frameW, setFrameW] = useState(0);
  const [frameH, setFrameH] = useState(0);
  const [containerW, setContainerW] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const [cropMode, setCropMode] = useState(false);
  const [zoomVisible, setZoomVisible] = useState(false);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const minScale = useSharedValue(1);
  const maxImageAreaH = Math.round(Dimensions.get("window").height * 0.68);

  useEffect(() => {
    setPhotoUri(initialUri);
  }, [initialUri]);

  useEffect(() => {
    setLoadError(false);
    if (!photoUri) return;
    RNImage.getSize(photoUri, (w, h) => {
      setImgW(w);
      setImgH(h);
    });
  }, [photoUri]);

  const recalcFrame = (width: number, iW: number, iH: number) => {
    if (!width || !iW || !iH) return;
    const naturalH = Math.round((width * iH) / iW);
    const h = Math.min(naturalH, maxImageAreaH);
    setFrameW(width);
    setFrameH(h);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerW(w);
    recalcFrame(w, imgW, imgH);
  };

  useEffect(() => {
    recalcFrame(containerW, imgW, imgH);
  }, [containerW, imgW, imgH]);

  const fitCover = () => {
    if (!imgW || !imgH || !frameW || !frameH) return;
    const s = Math.max(frameW / imgW, frameH / imgH);
    minScale.value = s;
    scale.value = withTiming(s);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
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
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((e) => {
      const w = imgW * scale.value;
      const h = imgH * scale.value;
      const maxX = Math.max((w - frameW) / 2, 0);
      const maxY = Math.max((h - frameH) / 2, 0);
      translateX.value = clamp(startX.value + e.translationX, -maxX, maxX);
      translateY.value = clamp(startY.value + e.translationY, -maxY, maxY);
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
      translateX.value = clamp(translateX.value, -maxX, maxX);
      translateY.value = clamp(translateY.value, -maxY, maxY);
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const aStyle = useAnimatedStyle(() => ({
    width: imgW,
    height: imgH,
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const computeCrop = () => {
    const s = scale.value;
    const w = imgW * s;
    const h = imgH * s;
    const left = (frameW - w) / 2 + translateX.value;
    const top = (frameH - h) / 2 + translateY.value;
    const visLeft = Math.max(0 - left, 0);
    const visTop = Math.max(0 - top, 0);
    const visRight = Math.min(frameW - left, w);
    const visBottom = Math.min(frameH - top, h);
    let originX = Math.round(visLeft / s);
    let originY = Math.round(visTop / s);
    let width = Math.round((visRight - visLeft) / s);
    let height = Math.round((visBottom - visTop) / s);
    originX = clamp(originX, 0, Math.max(imgW - 1, 0));
    originY = clamp(originY, 0, Math.max(imgH - 1, 0));
    width = clamp(width, 1, imgW - originX);
    height = clamp(height, 1, imgH - originY);
    return { originX, originY, width, height };
  };

  const handleCropConfirm = async () => {
    try {
      const crop = computeCrop();
      const res = await ImageManipulator.manipulateAsync(photoUri, [{ crop }], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      setPhotoUri(res.uri);
      setCropMode(false);
      setOriginalUri(null);
    } catch (err) {
      console.error("Crop failed", err);
    }
  };

  const handleCropCancel = () => {
    if (originalUri) setPhotoUri(originalUri);
    setCropMode(false);
  };

  const toggleCrop = () => {
    setCropMode((v) => {
      const next = !v;
      if (next) {
        setOriginalUri(photoUri);
        fitCover();
      }
      return next;
    });
  };

  const openZoom = () => {
    if (cropMode) return;
    setZoomVisible(true);
  };

  const closeZoom = () => setZoomVisible(false);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.background }]}
      onLayout={onLayout}
    >
      <View
        style={[
          styles.frame,
          { width: frameW, height: frameH, borderRadius: theme.rounded.lg },
        ]}
      >
        <Pressable style={styles.fill} onPress={openZoom}>
          <GestureDetector gesture={composed}>
            <View style={styles.clip}>
              {!loadError ? (
                <Animated.Image
                  source={{ uri: photoUri }}
                  style={[styles.img, aStyle, { backgroundColor: theme.card }]}
                  resizeMode="cover"
                  onError={() => setLoadError(true)}
                />
              ) : null}
            </View>
          </GestureDetector>
        </Pressable>

        {cropMode ? (
          <>
            <Pressable
              onPress={handleCropConfirm}
              style={[
                styles.fab,
                {
                  right: 60,
                  bottom: 10,
                  backgroundColor: theme.disabled.border,
                },
              ]}
            >
              <MaterialIcons name="check" size={24} color="#fff" />
            </Pressable>
            <Pressable
              onPress={handleCropCancel}
              style={[
                styles.fab,
                {
                  right: 10,
                  bottom: 10,
                  backgroundColor: theme.disabled.border,
                },
              ]}
            >
              <MaterialIcons name="close" size={24} color="#fff" />
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={toggleCrop}
            style={[
              styles.fab,
              {
                right: 10,
                bottom: 10,
                backgroundColor: "rgba(0,0,0,0.55)",
              },
            ]}
          >
            <MaterialIcons name="crop" size={24} color="#fff" />
          </Pressable>
        )}

        {cropMode && (
          <View
            pointerEvents="none"
            style={[styles.overlay, { borderRadius: theme.rounded.lg }]}
          >
            <View style={styles.grid}>
              {Array.from({ length: 2 }).map((_, i) => (
                <View
                  key={`v-${i}`}
                  style={[styles.lineV, { left: `${(i + 1) * 33.33}%` }]}
                />
              ))}
              {Array.from({ length: 2 }).map((_, i) => (
                <View
                  key={`h-${i}`}
                  style={[styles.lineH, { top: `${(i + 1) * 33.33}%` }]}
                />
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={styles.actionsBar}>
        <SecondaryButton
          label={secondaryText}
          onPress={onRetake}
          disabled={isLoading}
          style={styles.action}
        />
        <PrimaryButton
          label={primaryText}
          onPress={() => onAccept(photoUri)}
          loading={isLoading}
          disabled={isLoading}
          style={styles.action}
        />
      </View>

      <ZoomModal visible={zoomVisible} uri={photoUri} onClose={closeZoom} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
    gap: 32,
    alignItems: "center",
  },
  frame: {
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: 14,
    width: "100%",
  },
  fill: {
    width: "100%",
    height: "100%",
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
  actionsBar: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    width: "100%",
  },
  action: { flex: 1 },
  fab: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default PhotoPreview;
