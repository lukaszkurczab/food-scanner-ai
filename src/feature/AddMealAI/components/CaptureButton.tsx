import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const CaptureButton = ({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) => (
  <TouchableOpacity
    onPress={onPress}
    disabled={disabled}
    style={{
      width: 80,
      height: 80,
      backgroundColor: "#fff",
      borderRadius: 40,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 2,
      borderColor: "#000",
    }}
  >
    <Ionicons name="camera" size={36} color="black" />
  </TouchableOpacity>
);
