import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  Pressable,
  Image as RNImage,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as ImageManipulator from "expo-image-manipulator";

type PhotoPreviewProps = {
  photoUri: string;
  onRetake: () => void;
  onAccept: (optimizedUri: string) => void;
  isLoading?: boolean;
  noCrop?: boolean;
  primaryText: string;
  secondaryText: string;
};

const CROP_SIZE = 340;

export const PhotoPreview = ({
  photoUri,
  onRetake,
  onAccept,
  isLoading = false,
  noCrop = false,
  primaryText,
  secondaryText,
}: PhotoPreviewProps) => {
  const theme = useTheme();

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
      if (!noCrop) {
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
      }
    });
  }, [photoUri, noCrop]);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => setLoadError(false), [photoUri]);

  function clamp(val: number, min: number, max: number) {
    "worklet";
    return Math.max(min, Math.min(val, max));
  }

  const pan = Gesture.Pan()
    .enabled(!noCrop)
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
    .enabled(!noCrop)
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

  const handleAccept = async () => {
    let outUri = photoUri;
    try {
      const manipulated = await ImageManipulator.manipulateAsync(
        photoUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      outUri = manipulated.uri;
    } catch (err) {
      outUri = photoUri;
    }
    onAccept(outUri);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.cropBox}>
        {noCrop ? (
          !loadError ? (
            <RNImage
              source={{ uri: photoUri }}
              style={{
                width: "100%",
                height: "100%",
                resizeMode: "contain",
                borderRadius: 40,
              }}
              onError={() => setLoadError(true)}
            />
          ) : null
        ) : (
          <GestureDetector gesture={composed}>
            <View style={styles.centerContent}>
              {!loadError ? (
                <Animated.Image
                  source={{ uri: photoUri }}
                  style={[styles.image, animatedImageStyle]}
                  resizeMode="cover"
                  onError={() => setLoadError(true)}
                />
              ) : null}
            </View>
          </GestureDetector>
        )}
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
            {primaryText}
          </Text>
        )}
      </Pressable>
    </View>
  );
};

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
  image: {},
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
