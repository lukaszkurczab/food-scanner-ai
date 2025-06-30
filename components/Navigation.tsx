import { useTheme } from "../theme/useTheme";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { TouchableOpacity, View } from "react-native";

type NavigationItemProps = {
  target: string;
  icon: string;
};

const NavigationItem = ({ target, icon }: NavigationItemProps) => {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <TouchableOpacity
      onPress={() => navigation.navigate(target)}
      style={{
        backgroundColor: theme.background,
        padding: 10,
        borderRadius: 5,
        margin: 5,
        alignItems: "center",
        gap: 4,
        width: "20%",
      }}
    >
      <Icon name={icon} size={24} />
    </TouchableOpacity>
  );
};

export default function Navigation() {
  const { theme } = useTheme();

  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: theme.background,
        flexDirection: "row",
        justifyContent: "center",
        borderTopWidth: 1,
        borderTopColor: theme.card,
        padding: 2,
        paddingHorizontal: 20,
        overflow: "hidden",
      }}
    >
      <NavigationItem target="Home" icon="home" />
      <NavigationItem target="History" icon="calendar" />
      <NavigationItem target="Summary" icon="chart-bar" />
      <NavigationItem target="Chat" icon="robot" />
      <NavigationItem target="Profile" icon="user" />
    </View>
  );
}
