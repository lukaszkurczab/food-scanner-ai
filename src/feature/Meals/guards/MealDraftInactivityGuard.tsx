import React, { useEffect, useMemo } from "react";
import { useMealContext } from "@contexts/MealDraftContext";
import { useInactivity } from "@contexts/InactivityContext";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Modal } from "@/components/";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

type GuardProps = {
  children: React.ReactNode;
  enabledScreens?: string[];
};

export const MealDraftInactivityGuard: React.FC<GuardProps> = ({
  children,
  enabledScreens = [],
}) => {
  const { meal, clearMeal, removeDraft } = useMealContext();
  const { isModalVisible, setOnTimeout, dismissModal } = useInactivity();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { uid } = useAuthContext();
  const { t } = useTranslation("common");

  const isAllowed = useMemo(() => {
    if (!enabledScreens || enabledScreens.length === 0) return true;
    return enabledScreens.includes(route.name);
  }, [route.name, enabledScreens]);

  useEffect(() => {
    if (isAllowed && meal && meal.ingredients.length > 0) {
      setOnTimeout(() => {});
    } else {
      setOnTimeout(null);
    }
    return () => setOnTimeout(null);
  }, [isAllowed, meal, setOnTimeout]);

  const handleQuit = () => {
    if (uid) {
      clearMeal(uid);
      removeDraft(uid);
    }
    dismissModal();
    navigation.replace("Home");
  };

  return (
    <>
      {children}
      <Modal
        visible={isAllowed && isModalVisible}
        title={t("draft_inactivity_title")}
        message={t("draft_inactivity_message")}
        secondaryActionLabel={t("quit")}
        onSecondaryAction={handleQuit}
        primaryActionLabel={t("continue")}
        onPrimaryAction={dismissModal}
        onClose={dismissModal}
      />
    </>
  );
};
