import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import { SecondaryButton } from "@components/SecondaryButton";
import { useTranslation } from "react-i18next";
import { useTheme } from "@theme/index";
import type { RootStackParamList } from "@/navigation/navigate";

type ButtonSectionNavigation = StackNavigationProp<RootStackParamList>;

export const ButtonSection = () => {
  const theme = useTheme();
  const navigation = useNavigation<ButtonSectionNavigation>();
  const { t } = useTranslation("home");

  return (
    <>
      <SecondaryButton
        label={t("savedMeals")}
        onPress={() => {
          navigation.navigate("SavedMeals");
        }}
        textStyle={{
          letterSpacing: 1.2,
          fontFamily: theme.typography.fontFamily.medium,
        }}
      />
    </>
  );
};
