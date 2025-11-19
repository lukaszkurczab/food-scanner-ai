import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Datum = { value: number; color: string; label: string };

type Props = {
  data: Datum[];
  kcal: number;
  showLabel?: boolean;
};

export default function GaugeMacroChart({
  data,
  kcal,
  showLabel = true,
}: Props) {
  const total = Math.max(
    1,
    data.reduce((s, d) => s + d.value, 0)
  );
  let start = 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.gaugeOuter}>
        {data.map((d, i) => {
          const pct = d.value / total;
          const sweep = pct * 180; // kąt w półkole
          const rotate = start * 180;
          start += pct;

          return (
            <View
              key={i}
              style={[
                styles.segment,
                {
                  backgroundColor: d.color,
                  transform: [{ rotate: `${rotate}deg` }],
                  flexBasis: `${sweep}%`,
                },
              ]}
            />
          );
        })}
      </View>

      {showLabel && <Text style={styles.kcal}>{kcal} kcal</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: 220, alignItems: "center" },
  gaugeOuter: {
    width: 200,
    height: 100,
    overflow: "hidden",
    flexDirection: "row",
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  segment: {
    height: "100%",
  },
  kcal: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
  },
});
