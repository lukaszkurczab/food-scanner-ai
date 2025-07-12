import { useTheme } from "@theme/index";
import { JSX } from "react";
import { TouchableOpacity } from "react-native";

export const Tile = ({
  children,
  style = {},
  onPress,
}: {
  children: JSX.Element;
  style?: object | undefined;
  onPress?: () => void | undefined;
}) => {
  const theme = useTheme();

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
};
