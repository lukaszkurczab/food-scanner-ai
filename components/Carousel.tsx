import React, { useEffect } from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";

interface CarouselProps {
  height: number;
  items: Array<{ id: string; component: React.ReactNode }>;
  selectedIndex?: number;
  setSelectedIndex?: (newIndex: number) => void;
}

const { width: screenWidth } = Dimensions.get("window");

export const Carousel: React.FC<CarouselProps> = ({
  height,
  items,
  selectedIndex = 0,
}) => {
  const lastItemIndex = items.length - 1;
  const currentIndex = useSharedValue(selectedIndex);
  const currentTranslateX = useSharedValue(0);
  const currentScale = useSharedValue(1);
  const currentZIndex = useSharedValue(10);
  const prevTranslateX = useSharedValue(-64);
  const prevScale = useSharedValue(0.8);
  const prevZIndex = useSharedValue(1);
  const nextTranslateX = useSharedValue(64);
  const nextScale = useSharedValue(0.8);
  const nextZIndex = useSharedValue(1);
  const newItemIndex = useSharedValue(selectedIndex);
  const startPosition = useSharedValue(-1000);
  const distance = useSharedValue(0);
  const direction = useSharedValue("none");
  const changeWidth = (screenWidth - 128) / 2;
  const adjustedTranslationX = screenWidth - 128;

  useEffect(() => {
    if (selectedIndex !== currentIndex.value) {
      direction.value = selectedIndex > currentIndex.value ? "left" : "right";
      newItemIndex.value = selectedIndex;
      currentIndex.value = selectedIndex;

      switch (direction.value) {
        case "left":
          currentScale.value = withTiming(0.8, { duration: 500 });
          currentTranslateX.value = withTiming(-64, { duration: 500 });
          nextScale.value = withTiming(1, { duration: 500 });
          nextTranslateX.value = withTiming(0, { duration: 500 });
          break;
        case "right":
          currentScale.value = withTiming(0.8, { duration: 500 });
          currentTranslateX.value = withTiming(64, { duration: 500 });
          prevScale.value = withTiming(1, { duration: 500 });
          prevTranslateX.value = withTiming(0, { duration: 500 });
          break;
        default:
          prevScale.value = withTiming(0.8, { duration: 500 });
          currentScale.value = withTiming(1, { duration: 500 });
          nextScale.value = withTiming(0.8, { duration: 500 });
          prevTranslateX.value = withTiming(-64, { duration: 500 });
          nextTranslateX.value = withTiming(64, { duration: 500 });
          currentTranslateX.value = withTiming(0, { duration: 500 });
          break;
      }
    }
  }, [selectedIndex]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      currentIndex.value = newItemIndex.value;
      prevScale.value = 0.8;
      currentScale.value = 1;
      nextScale.value = 0.8;
      prevZIndex.value = 1;
      nextZIndex.value = 1;
      currentZIndex.value = 100;
      prevTranslateX.value = -64;
      nextTranslateX.value = 64;
      currentTranslateX.value = 0;
      startPosition.value = -1000;
      distance.value = 0;
      direction.value = "none";
    })
    .onChange((event) => {
      if (startPosition.value === -1000) startPosition.value = event.x;
      distance.value = Math.abs(startPosition.value - event.x);

      if (event.translationX > 0) {
        if (distance.value <= changeWidth && currentIndex.value > 0) {
          currentScale.value =
            1 - 0.2 * (distance.value / adjustedTranslationX) > 0.8
              ? 1 - 0.2 * (distance.value / adjustedTranslationX)
              : 0.8;
          direction.value = "none";
          newItemIndex.value = currentIndex.value;
          currentZIndex.value = 100;
          prevZIndex.value = 1;
          prevTranslateX.value = -64 - distance.value;
          currentTranslateX.value = distance.value;
          prevScale.value = Math.max(
            0.8 + 0.2 * (distance.value / adjustedTranslationX)
          );
        } else if (
          distance.value <= 2 * changeWidth &&
          currentIndex.value > 0
        ) {
          currentScale.value =
            1 - 0.2 * (distance.value / adjustedTranslationX) > 0.8
              ? 1 - 0.2 * (distance.value / adjustedTranslationX)
              : 0.8;
          direction.value = "right";
          newItemIndex.value = currentIndex.value - 1;
          currentZIndex.value = 1;
          prevZIndex.value = 100;
          prevTranslateX.value =
            -64 -
            changeWidth +
            distance.value -
            changeWidth +
            (64 / changeWidth) * (distance.value - changeWidth);
          currentTranslateX.value =
            changeWidth -
            distance.value +
            changeWidth +
            (64 / changeWidth) * (distance.value - changeWidth);
          prevScale.value = Math.max(
            0.8 + 0.2 * (distance.value / adjustedTranslationX)
          );
        }
      } else {
        if (
          distance.value <= changeWidth &&
          currentIndex.value < lastItemIndex
        ) {
          currentScale.value =
            1 - 0.2 * (distance.value / adjustedTranslationX) > 0.8
              ? 1 - 0.2 * (distance.value / adjustedTranslationX)
              : 0.8;
          if (distance.value > 50) prevZIndex.value = -1;
          direction.value = "none";
          newItemIndex.value = currentIndex.value;
          currentZIndex.value = 100;
          nextZIndex.value = 1;
          nextTranslateX.value = 64 + distance.value;
          currentTranslateX.value = -distance.value;
          nextScale.value = Math.max(
            0.8 + 0.2 * (distance.value / adjustedTranslationX)
          );
        } else if (
          distance.value <= 2 * changeWidth &&
          currentIndex.value < lastItemIndex
        ) {
          currentScale.value =
            1 - 0.2 * (distance.value / adjustedTranslationX) > 0.8
              ? 1 - 0.2 * (distance.value / adjustedTranslationX)
              : 0.8;
          direction.value = "left";
          newItemIndex.value = currentIndex.value + 1;
          currentZIndex.value = 1;
          nextZIndex.value = 100;
          nextTranslateX.value =
            64 +
            changeWidth -
            distance.value +
            changeWidth -
            (64 / changeWidth) * (distance.value - changeWidth);
          currentTranslateX.value =
            -changeWidth +
            distance.value -
            changeWidth -
            (64 / changeWidth) * (distance.value - changeWidth);
          nextScale.value = Math.max(
            0.8 + 0.2 * (distance.value / adjustedTranslationX)
          );
        }
      }
    })
    .onEnd(() => {
      switch (direction.value) {
        case "left":
          currentScale.value = withTiming(0.8, { duration: 500 });
          currentTranslateX.value = withTiming(-64, { duration: 500 });
          nextScale.value = withTiming(1, { duration: 500 });
          nextTranslateX.value = withTiming(0, { duration: 500 });
          break;
        case "right":
          currentScale.value = withTiming(0.8, { duration: 500 });
          currentTranslateX.value = withTiming(64, { duration: 500 });
          prevScale.value = withTiming(1, { duration: 500 });
          prevTranslateX.value = withTiming(0, { duration: 500 });
          break;
        default:
          prevScale.value = withTiming(0.8, { duration: 500 });
          currentScale.value = withTiming(1, { duration: 500 });
          nextScale.value = withTiming(0.8, { duration: 500 });
          prevTranslateX.value = withTiming(-64, { duration: 500 });
          nextTranslateX.value = withTiming(64, { duration: 500 });
          currentTranslateX.value = withTiming(0, { duration: 500 });
          break;
      }
    });
  return (
    <GestureHandlerRootView
      style={{ height: height, overflow: "hidden", width: screenWidth }}
    >
      <GestureDetector gesture={pan}>
        <View style={styles.container}>
          <View style={styles.itemsWrapper}>
            {items.map((item, index) => {
              const animatedStyle = useAnimatedStyle(() => ({
                transform:
                  index === currentIndex.value
                    ? [
                        { scale: currentScale.value },
                        { translateX: currentTranslateX.value },
                      ]
                    : index === currentIndex.value - 1
                    ? [
                        {
                          scale: prevScale.value,
                        },
                        {
                          translateX: prevTranslateX.value,
                        },
                      ]
                    : index === currentIndex.value + 1
                    ? [
                        {
                          scale: nextScale.value,
                        },
                        {
                          translateX: nextTranslateX.value,
                        },
                      ]
                    : index < currentIndex.value - 1
                    ? [{ scale: 0.8 }, { translateX: -64 }]
                    : [{ scale: 0.8 }, { translateX: 64 }],
                zIndex:
                  index === currentIndex.value
                    ? currentZIndex.value
                    : index === currentIndex.value - 1
                    ? prevZIndex.value - index
                    : index === currentIndex.value + 1
                    ? nextZIndex.value - index
                    : index < currentIndex.value - 1
                    ? prevZIndex.value - 1000
                    : nextZIndex.value - 1000,
              }));

              return (
                <Animated.View
                  key={item.id}
                  style={[styles.itemContainer, animatedStyle]}
                >
                  {item.component}
                </Animated.View>
              );
            })}
          </View>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    width: screenWidth,
  },
  itemsWrapper: {
    position: "relative",
    left: 32,
  },
  itemContainer: {
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    width: screenWidth - 64,
  },
});
