import React, { useEffect, useState, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/theme/useTheme";
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
import { useMealDraftContext } from "@contexts/MealDraftContext";
import { v4 as uuidv4 } from "uuid";
import { usePremiumContext } from "@/context/PremiumContext";
import { canUseAiTodayFor } from "@/services/userService";

type MealAddMethodNavigationProp = StackNavigationProp<
  RootStackParamList,
  "MealAddMethod"
>;

const options = [
  {
    key: "ai_photo",
    icon: "camera-alt",
    titleKey: "aiTitle",
    descKey: "aiDesc",
    screen: "MealCamera",
  },
  {
    key: "ai_text",
    icon: "chat",
    titleKey: "aiTextTitle",
    descKey: "aiTextDesc",
    screen: "MealTextAI",
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
    screen: "SelectSavedMeal",
  },
];

const MealAddMethodScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<MealAddMethodNavigationProp>();
  const { t } = useTranslation("meals");
  const { uid } = useAuthContext();
  const { meal, setMeal, saveDraft, setLastScreen, loadDraft } =
    useMealDraftContext();
  const { isPremium } = usePremiumContext();

  const [showModal, setShowModal] = useState(false);
  const [lastScreen, setLastScreenState] = useState<string | null>(null);
  const [showAiLimit, setShowAiLimit] = useState(false);

  const checkDraft = useCallback(async () => {
    if (!uid) return;
    const draft = await AsyncStorage.getItem(getDraftKey(uid));
    const lastScreenStored = await AsyncStorage.getItem(getScreenKey(uid));
    if (draft && lastScreenStored) {
      try {
        const parsedDraft = JSON.parse(draft);
        if (
          (parsedDraft?.name && parsedDraft.name !== null) ||
          (Array.isArray(parsedDraft?.ingredients) &&
            parsedDraft.ingredients.length > 0) ||
          parsedDraft?.photoUrl
        ) {
          setShowModal(true);
          setLastScreenState(lastScreenStored);
        }
      } catch {}
    }
  }, [uid]);

  useEffect(() => {
    checkDraft();
  }, [checkDraft]);

  const primeEmptyMeal = useCallback(
    async (nextScreen: string) => {
      if (!uid) return;
      const now = new Date().toISOString();
      setMeal({
        mealId: uuidv4(),
        userUid: uid,
        name: null,
        photoUrl: null,
        ingredients: [],
        createdAt: now,
        updatedAt: now,
        syncState: "pending",
        tags: [],
        deleted: false,
        notes: null,
        type: "other",
        timestamp: "",
        source: null,
        cloudId: undefined,
      } as any);
      await saveDraft(uid);
      await setLastScreen(uid, nextScreen);
    },
    [setMeal, saveDraft, setLastScreen, uid]
  );

  const handleOptionPress = async (screen: string) => {
    if (screen === "MealTextAI") {
      if (uid) {
        const allowed = await canUseAiTodayFor(uid, !!isPremium, "text", 1);
        if (!allowed) {
          setShowAiLimit(true);
          return;
        }
      }
    }
    if (screen === "MealCamera" || screen === "ReviewIngredients") {
      await primeEmptyMeal(screen);
    }
    navigation.navigate(screen as any);
  };

  const handleContinue = async () => {
    if (uid) await loadDraft(uid);
    setShowModal(false);
    if (lastScreen) navigation.navigate(lastScreen as any);
  };

  const handleDiscard = async () => {
    if (!uid) return;
    await AsyncStorage.removeItem(getDraftKey(uid));
    await AsyncStorage.removeItem(getScreenKey(uid));
    setShowModal(false);
    setLastScreenState(null);
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

      <View style={[styles.optionsWrap, { gap: spacing.xl }]}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.key}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: theme.card,
              borderRadius: rounded.md,
              paddingHorizontal: spacing.lg,
              paddingVertical: spacing.md,
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
                size={48}
                color={theme.accentSecondary}
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

      <Modal
        visible={showAiLimit}
        title={t("limit.reachedTitle", {
          ns: "chat",
          defaultValue: "Daily limit reached",
        })}
        message={t("limit.reachedShort", {
          ns: "chat",
        })}
        primaryActionLabel={t("limit.upgradeCta", {
          ns: "chat",
          defaultValue: "Upgrade",
        })}
        onPrimaryAction={() => {
          setShowAiLimit(false);
          navigation.navigate("ManageSubscription" as any);
        }}
        secondaryActionLabel={t("cancel", {
          ns: "common",
          defaultValue: "Close",
        })}
        onSecondaryAction={() => setShowAiLimit(false)}
        onClose={() => setShowAiLimit(false)}
        stackActions
      />
    </Layout>
  );
};

export default MealAddMethodScreen;

const styles = StyleSheet.create({
  optionsWrap: { flexGrow: 1, justifyContent: "flex-start" },
});
