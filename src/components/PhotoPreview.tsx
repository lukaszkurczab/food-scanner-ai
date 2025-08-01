import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Image as RNImage,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { useTranslation } from "react-i18next";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

type PhotoPreviewProps = {
  photoUri: string;
  onRetake: () => void;
  onAccept: () => void;
  isLoading?: boolean;
};

const CROP_SIZE = 340;

export default function PhotoPreview({
  photoUri,
  onRetake,
  onAccept,
  isLoading = false,
}: PhotoPreviewProps) {
  const theme = useTheme();
  const { t } = useTranslation("common");

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const [imageWidth, setImageWidth] = useState(CROP_SIZE);
  const [imageHeight, setImageHeight] = useState(CROP_SIZE);
  const [minScale, setMinScale] = useState(1);

  useEffect(() => {
    if (!photoUri) return;
    RNImage.getSize(photoUri, (width, height) => {
      setImageWidth(width);
      setImageHeight(height);
      const scaleW = CROP_SIZE / width;
      const scaleH = CROP_SIZE / height;
      const min = Math.max(scaleW, scaleH);
      setMinScale(min);
      scale.value = min;
      savedScale.value = min;
      translateX.value = 0;
      translateY.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });
  }, [photoUri]);

  function clamp(val: number, min: number, max: number) {
    "worklet";
    return Math.max(min, Math.min(val, max));
  }

  const pan = Gesture.Pan()
    .onBegin(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((e) => {
      let newX = savedTranslateX.value + e.translationX;
      let newY = savedTranslateY.value + e.translationY;
      const scaledW = imageWidth * scale.value;
      const scaledH = imageHeight * scale.value;
      let maxX = Math.max((scaledW - CROP_SIZE) / 2, 0);
      let minX = -maxX;
      let maxY = Math.max((scaledH - CROP_SIZE) / 2, 0);
      let minY = -maxY;
      translateX.value = clamp(newX, minX, maxX);
      translateY.value = clamp(newY, minY, maxY);
    });

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      let nextScale = clamp(savedScale.value * e.scale, minScale, 6);
      scale.value = nextScale;
      const scaledW = imageWidth * nextScale;
      const scaledH = imageHeight * nextScale;
      let maxX = Math.max((scaledW - CROP_SIZE) / 2, 0);
      let minX = -maxX;
      let maxY = Math.max((scaledH - CROP_SIZE) / 2, 0);
      let minY = -maxY;
      translateX.value = clamp(translateX.value, minX, maxX);
      translateY.value = clamp(translateY.value, minY, maxY);
    });

  const composed = Gesture.Simultaneous(pan, pinch);

  const animatedImageStyle = useAnimatedStyle(() => ({
    width: imageWidth,
    height: imageHeight,
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.cropBox}>
        <GestureDetector gesture={composed}>
          <View style={styles.centerContent}>
            <Animated.Image
              source={{ uri: photoUri }}
              style={[styles.image, animatedImageStyle]}
              resizeMode="cover"
            />
          </View>
        </GestureDetector>
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
            marginTop: 40,
            opacity: isLoading ? 0.6 : 1,
          },
        ]}
      >
        <Text
          style={[styles.buttonText, { color: theme.text, fontWeight: "bold" }]}
        >
          {t("camera_retake")}
        </Text>
      </Pressable>
      <Pressable
        onPress={onAccept}
        disabled={isLoading}
        style={[
          styles.button,
          {
            backgroundColor: theme.accentSecondary,
            borderColor: "transparent",
            marginTop: 16,
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
            {t("camera_use_photo")}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  cropBox: {
    width: CROP_SIZE,
    height: CROP_SIZE,
    borderRadius: 40,
    overflow: "hidden",
    backgroundColor: "#B2C0C9",
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  centerContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    // bez absolute!
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 20,
  },
});
