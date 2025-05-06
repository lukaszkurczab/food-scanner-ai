import { useTheme } from "@/theme/useTheme";
import { Text, TouchableOpacity } from "react-native";

export default function Tile({
  children,
  style = {},
  onPress,
}: {
  children: JSX.Element;
  style?: object | undefined;
  onPress?: () => void | undefined;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        borderRadius: 12,
        backgroundColor: theme.card,
        padding: 16,
        justifyContent: "center",
        width: "100%",
        ...style,
      }}
    >
      {children}
    </TouchableOpacity>
  );
}