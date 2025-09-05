import React from "react";
import { View, Text, Image } from "react-native";
import { PieChart } from "@/components/PieChart";

export type ShareCardProps = {
  title: string;
  dateText: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  photoUri?: string | null;
};

export default function ShareCard(props: ShareCardProps) {
  const { title, dateText, kcal, protein, fat, carbs, photoUri } = props;
  return (
    <View
      style={{
        width: 360,
        aspectRatio: 9 / 16,
        padding: 20,
        backgroundColor: "#0B0B0D",
        borderRadius: 24,
        overflow: "hidden",
      }}
    >
      {photoUri ? (
        <Image
          source={{ uri: photoUri }}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
            opacity: 0.2,
          }}
        />
      ) : null}
      <Text style={{ color: "white", fontSize: 22, fontWeight: "700" }}>
        {title}
      </Text>
      <Text style={{ color: "#9AA0A6", marginTop: 4 }}>{dateText}</Text>
      <View style={{ marginTop: 12 }}>
        <PieChart
          data={[
            { value: carbs, color: "#66BB6A", label: "Carbs" },
            { value: protein, color: "#2196F3", label: "Protein" },
            { value: fat, color: "#C6A025", label: "Fat" },
          ]}
          maxSize={220}
          minSize={180}
          legendWidth={120}
        />
      </View>
      <Text style={{ color: "white", marginTop: 12, fontSize: 18 }}>
        {Math.round(kcal)} kcal
      </Text>
      <Text
        style={{
          color: "#9AA0A6",
          position: "absolute",
          bottom: 16,
          right: 16,
        }}
      >
        CaloriAI
      </Text>
    </View>
  );
}
