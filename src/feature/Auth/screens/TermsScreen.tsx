import { useMemo } from "react";
import { Dimensions, StyleSheet, ViewStyle } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/theme/useTheme";
import { Layout, PrimaryButton } from "@/components";
import { ScrollableBox } from "@/components/ScrollableBox";
import { parseMarkdownToReactNative } from "@/utils/parseMarkdownToReactNative";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

type TermsNavigation = StackNavigationProp<RootStackParamList, "Terms">;

type TermsScreenProps = {
  navigation: TermsNavigation;
};

export default function TermsScreen({ navigation }: TermsScreenProps) {
  const { t } = useTranslation("terms");
  const theme = useTheme();

  const windowHeight = Dimensions.get("window").height;
  const calculatedHeight = Math.max(0, windowHeight - 190);
  const scrollStyle = useMemo<ViewStyle>(
    () => ({ height: calculatedHeight }),
    [calculatedHeight]
  );

  const termsText = t("text");

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <Layout showNavigation={false} disableScroll>
      <ScrollableBox style={scrollStyle}>
        {parseMarkdownToReactNative(termsText, theme)}
      </ScrollableBox>

      <PrimaryButton
        label={t("close")}
        onPress={handleClose}
        style={styles.cta}
      />
    </Layout>
  );
}

const styles = StyleSheet.create({
  cta: {
    width: 200,
    alignSelf: "center",
  },
});
