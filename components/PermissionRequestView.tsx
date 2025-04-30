import React from "react";
import { View, Text, TouchableOpacity } from "react-native";

type Props = {
  message: string;
  onPress: () => void;
};

export const PermissionRequestView = ({ message, onPress }: Props) => (
  <View
    style={{
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 20,
    }}
  >
    <Text style={{ fontSize: 18, textAlign: "center", marginBottom: 20 }}>
      {message}
    </Text>
    <TouchableOpacity
      onPress={onPress}
      style={{ backgroundColor: "#007bff", padding: 10, borderRadius: 8 }}
    >
      <Text style={{ color: "#fff", fontWeight: "bold" }}>Grant Access</Text>
    </TouchableOpacity>
  </View>
);
