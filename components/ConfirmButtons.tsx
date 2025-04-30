import React from "react";
import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onAccept: () => void;
  onReject: () => void;
};

export const ConfirmButtons = ({ onAccept, onReject }: Props) => (
  <View
    style={{
      position: "absolute",
      bottom: 40,
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-around",
    }}
  >
    <TouchableOpacity onPress={onReject}>
      <Ionicons name="close-circle" size={64} color="red" />
    </TouchableOpacity>
    <TouchableOpacity onPress={onAccept}>
      <Ionicons name="checkmark-circle" size={64} color="green" />
    </TouchableOpacity>
  </View>
);
