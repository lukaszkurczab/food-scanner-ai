import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

interface StepViewProps {
  step: number;
  totalSteps: number;
  children: React.ReactNode[];
}

export const StepView: React.FC<StepViewProps> = ({
  step,
  totalSteps,
  children,
}) => {
  return (
    <View style={styles.container}>
      <View
        style={[
          styles.stepContainer,
          {
            width: width * totalSteps,
            transform: [{ translateX: -width * step }],
          },
        ]}
      >
        {children.map((child, index) => (
          <View key={index} style={{ width }}>
            {child}
          </View>
        ))}
      </View>

      <View style={styles.indicatorContainer}>
        {children.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, step === index && styles.activeDot]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stepContainer: {
    flexDirection: "row",
    flex: 1,
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: "#ccc",
  },
  activeDot: {
    backgroundColor: "#000",
  },
});
