import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/src/theme";
import { RootStackParamList } from "@/src/navigation/navigate";
import { StackNavigationProp } from "@react-navigation/stack";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing, rounded } from "@/src/theme";
import { useTranslation } from "react-i18next";
import { Layout } from "@/src/components";

type MealInputMethodNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MealInputMethod"
>;

const options = [
  {
    key: "ai",
    icon: "camera-alt",
    titleKey: "aiTitle",
    descKey: "aiDesc",
    onPress: (navigation: any) => navigation.navigate("Camera"),
  },
  {
    key: "manual",
    icon: "edit",
    titleKey: "manualTitle",
    descKey: "manualDesc",
    onPress: (navigation: any) => navigation.navigate("AddMealManual"),
  },
  {
    key: "saved",
    icon: "library-books",
    titleKey: "savedTitle",
    descKey: "savedDesc",
    onPress: (navigation: any) => navigation.navigate("AddMealFromList"),
  },
];

const MealInputMethodScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<MealInputMethodNavigationProp>();
  const { t } = useTranslation("meals");

  return (
    <Layout>
      <Text
        style={{
          fontSize: theme.typography.size.xxl,
          fontWeight: "bold",
          color: theme.text,
          textAlign: "center",
          marginBottom: spacing.md,
        }}
      >
        {t("title", "Add a meal")}
      </Text>
      <Text
        style={{
          fontSize: theme.typography.size.md,
          color: theme.textSecondary,
          textAlign: "center",
          marginBottom: spacing.xl,
        }}
      >
        {t("subtitle", "Choose how you want to add meal")}
      </Text>

      <View style={{ gap: spacing.xl, flexGrow: 1, justifyContent: "center" }}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.card,
              borderRadius: rounded.md,
              padding: spacing.lg,
              borderWidth: 1.5,
              borderColor: theme.border,
              shadowColor: theme.shadow,
              shadowOpacity: 0.1,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 12,
            }}
            onPress={() => option.onPress(navigation)}
          >
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: rounded.sm,
                marginRight: spacing.lg,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <MaterialIcons
                name={option.icon as any}
                size={36}
                color={theme.textSecondary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: theme.typography.size.lg,
                  fontWeight: "bold",
                  color: theme.text,
                  marginBottom: 4,
                }}
              >
                {t(option.titleKey)}
              </Text>
              <Text
                style={{
                  fontSize: theme.typography.size.base,
                  color: theme.textSecondary,
                  opacity: 0.95,
                }}
              >
                {t(option.descKey)}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Layout>
  );
};

export default MealInputMethodScreen;
