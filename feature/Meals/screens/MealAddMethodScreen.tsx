import { Text, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@theme/index";
import { RootStackParamList } from "@navigation/navigate";
import { StackNavigationProp } from "@react-navigation/stack";
import { FormScreenWrapper, Tile } from "@components/index";

type MealInputMethodNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MealInputMethod"
>;

const MealInputMethodScreen = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const navigation = useNavigation<MealInputMethodNavigationProp>();

  return (
    <FormScreenWrapper contentContainerStyle={styles.container}>
      <Text style={styles.header}>How do you want to add a meal?</Text>
      <Text style={styles.subText}>Choose your preferred method</Text>

      <View style={styles.tiles}>
        <Tile onPress={() => navigation.navigate("Camera")}>
          <Text style={styles.tileText}>AI Detection</Text>
        </Tile>

        <Tile onPress={() => navigation.navigate("AddMealManual")}>
          <Text style={styles.tileText}>Enter Manually</Text>
        </Tile>

        <Tile onPress={() => navigation.navigate("AddMealFromList")}>
          <Text style={styles.tileText}>Select From List</Text>
        </Tile>
      </View>
    </FormScreenWrapper>
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      justifyContent: "center",
      padding: 16,
      backgroundColor: theme.background,
    },
    header: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 8,
      textAlign: "center",
      color: theme.primary,
    },
    subText: {
      textAlign: "center",
      fontSize: 16,
      marginBottom: 24,
      color: theme.text,
    },
    tiles: {
      gap: 16,
    },
    tileText: {
      fontSize: 18,
      fontWeight: "500",
      color: theme.text,
      textAlign: "center",
    },
  });

export default MealInputMethodScreen;
