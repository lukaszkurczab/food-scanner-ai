import { useTheme } from "@/theme/useTheme";
import { Text, TouchableOpacity } from "react-native";

export default function Tile({
  title,
  description = "",
  style = {},
  onPress,
}: {
  title: string;
  description?: string;
  style?: object | undefined;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 100,
        height: 100,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: theme.primary,
        justifyContent: "center",
        ...style,
      }}
    >
      <Text
        style={{
          color: theme.card,
          padding: 5,
          fontSize: 16,
        }}
      >
        {title}
      </Text>
      {description.length > 0 && (
        <Text
        style={{
          color: theme.card,
          padding: 5,
        }}
      >
        {description}
      </Text>)
      }
    </TouchableOpacity>
  );
}