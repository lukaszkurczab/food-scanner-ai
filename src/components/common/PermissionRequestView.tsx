import { useTheme } from "@/src/theme/index";
import { View, Text, TouchableOpacity } from "react-native";

type Props = {
  message: string;
  onPress: () => void;
};

export const PermissionRequestView = ({ message, onPress }: Props) => {
  const theme = useTheme();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: theme.background,
      }}
    >
      <Text style={{ fontSize: 18, textAlign: "center", marginBottom: 20 }}>
        {message}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        style={{
          backgroundColor: theme.accent,
          paddingVertical: 12,
          paddingHorizontal: 24,
          borderRadius: 32,
        }}
      >
        <Text
          style={{ color: theme.background, fontWeight: "bold", fontSize: 16 }}
        >
          Grant Access
        </Text>
      </TouchableOpacity>
    </View>
  );
};
