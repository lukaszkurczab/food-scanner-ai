import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme";
import { RootStackParamList } from "@/navigation/navigate";
import { StackNavigationProp } from "@react-navigation/stack";
import { MaterialIcons } from "@expo/vector-icons";
import { spacing, rounded } from "@/theme";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Modal } from "@/components/Modal";
import { getDraftKey, getScreenKey } from "@contexts/MealDraftContext";
import { useAuthContext } from "@/context/AuthContext";

type MealAddMethodNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MealAddMethod"
>;

const options = [
  {
    key: "ai",
    icon: "camera-alt",
    titleKey: "aiTitle",
    descKey: "aiDesc",
    screen: "MealCamera",
  },
  {
    key: "manual",
    icon: "edit",
    titleKey: "manualTitle",
    descKey: "manualDesc",
    screen: "ReviewIngredients",
  },
  {
    key: "saved",
    icon: "library-books",
    titleKey: "savedTitle",
    descKey: "savedDesc",
    screen: "AddMealFromList",
  },
];

const MealAddMethodScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<MealAddMethodNavigationProp>();
  const { t } = useTranslation("meals");
  const { user } = useAuthContext();

  const [showModal, setShowModal] = useState(false);
  const [draftExists, setDraftExists] = useState(false);
  const [lastScreen, setLastScreen] = useState<string | null>(null);

  const checkDraft = useCallback(async () => {
    if (!user?.uid) return;
    const draft = await AsyncStorage.getItem(getDraftKey(user.uid));
    const lastScreenStored = await AsyncStorage.getItem(getScreenKey(user.uid));
    if (draft && lastScreenStored) {
      setDraftExists(true);
      setLastScreen(lastScreenStored);
    }
  }, [user?.uid]);

  useEffect(() => {
    checkDraft();
  }, [checkDraft]);

  useEffect(() => {
    if (draftExists) setShowModal(true);
  }, [draftExists]);

  const handleOptionPress = (screen: string) => {
    navigation.navigate(screen as any);
  };

  const handleContinue = () => {
    setShowModal(false);
    if (lastScreen) {
      navigation.navigate(lastScreen as any);
    }
  };

  const handleDiscard = async () => {
    if (!user?.uid) return;
    await AsyncStorage.removeItem(getDraftKey(user.uid));
    await AsyncStorage.removeItem(getScreenKey(user.uid));
    setShowModal(false);
    setDraftExists(false);
    setLastScreen(null);
  };

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
        {t("title")}
      </Text>
      <Text
        style={{
          fontSize: theme.typography.size.md,
          color: theme.textSecondary,
          textAlign: "center",
          marginBottom: spacing.xl,
        }}
      >
        {t("subtitle")}
      </Text>

      <View
        style={{
          gap: spacing.xl,
          flexGrow: 1,
          justifyContent: "flex-start",
          paddingTop: spacing.xl,
        }}
      >
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
            onPress={() => handleOptionPress(option.screen)}
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

      <Modal
        visible={showModal}
        title={t("continue_draft_title")}
        message={t("continue_draft_message")}
        primaryActionLabel={t("continue")}
        onPrimaryAction={handleContinue}
        secondaryActionLabel={t("discard")}
        onSecondaryAction={handleDiscard}
        onClose={() => setShowModal(false)}
      />
    </Layout>
  );
};

export default MealAddMethodScreen;
