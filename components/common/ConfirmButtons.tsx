import { View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@theme/index";

type Props = {
  onAccept: () => void;
  onReject: () => void;
};

export const ConfirmButtons = ({ onAccept, onReject }: Props) => {
  const theme = useTheme();

  return (
    <View
      style={{
        position: "absolute",
        bottom: 16,
        width: "100%",
        flexDirection: "row",
        justifyContent: "space-around",
      }}
    >
      <TouchableOpacity onPress={onReject}>
        <Ionicons name="close-circle" size={64} color={theme.background} />
      </TouchableOpacity>
      <TouchableOpacity onPress={onAccept}>
        <Ionicons name="checkmark-circle" size={64} color={theme.background} />
      </TouchableOpacity>
    </View>
  );
};
