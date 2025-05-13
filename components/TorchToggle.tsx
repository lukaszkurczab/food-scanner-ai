import { TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const TorchToggle = ({
  on,
  toggle,
}: {
  on: boolean;
  toggle: () => void;
}) => (
  <TouchableOpacity onPress={toggle}>
    <Ionicons
      name={on ? "flashlight" : "flashlight-outline"}
      size={28}
      color="white"
    />
  </TouchableOpacity>
);
