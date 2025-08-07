import React from "react";
import { View, StyleSheet, Text, Image } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "@/src/theme/useTheme";
import { useTranslation } from "react-i18next";
import {
  PrimaryButton,
  SecondaryButton,
  ErrorButton,
  Layout,
} from "@/src/components";

const MAX_ATTEMPTS = 3;

export default function IngredientsNotRecognizedScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  const { t } = useTranslation("meals");

  const { image, id, attempt = 1 } = route.params || {};

  const handleRetake = () => {
    if (attempt < MAX_ATTEMPTS) {
      navigation.replace("MealCamera", { id, attempt: attempt + 1 });
    } else {
      navigation.replace("AddMealManual", { id, image });
    }
  };

  const handleOtherMethod = () => {
    navigation.replace("MealAddMethod");
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <Layout hiddenLayout={true}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Image
          source={{ uri: image }}
          style={styles.image}
          resizeMode="cover"
        />
        <Text style={[styles.title, { color: theme.text }]}>
          {t("not_recognized_title", "We couldn't recognize the ingredients")}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {attempt < MAX_ATTEMPTS
            ? t("not_recognized_sub", "Try again or select other method")
            : t(
                "not_recognized_last",
                "Please add the meal manually or try later."
              )}
        </Text>
        <View style={{ height: 24 }} />

        {attempt < MAX_ATTEMPTS && (
          <PrimaryButton
            label={`${t(
              "retake",
              "Retake photo"
            )} (${attempt}/${MAX_ATTEMPTS})`}
            onPress={handleRetake}
            style={{ marginTop: 0 }}
          />
        )}

        <SecondaryButton
          label={t("select_method", "Select other method")}
          onPress={handleOtherMethod}
          style={{ marginTop: 12 }}
        />
        <ErrorButton
          label={t("cancel", "Cancel")}
          onPress={handleCancel}
          style={{ marginTop: 12 }}
        />
      </View>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  image: {
    width: 220,
    height: 140,
    borderRadius: 32,
    marginBottom: 28,
    backgroundColor: "#B2C0C9",
  },
  title: { fontSize: 22, fontWeight: "bold", textAlign: "center" },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
  },
});
