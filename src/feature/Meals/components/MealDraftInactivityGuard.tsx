import React, { useEffect } from "react";
import { useMealContext } from "@contexts/MealDraftContext";
import { useInactivity } from "@contexts/InactivityContext";
import { useNavigation } from "@react-navigation/native";
import { Modal } from "@/components/";
import { useAuthContext } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export const MealDraftInactivityGuard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { meal, clearMeal, removeDraft } = useMealContext();
  const { isModalVisible, setOnTimeout, dismissModal } = useInactivity();
  const navigation = useNavigation<any>();
  const { user } = useAuthContext();
  const { t } = useTranslation("common");

  useEffect(() => {
    if (meal && meal.ingredients.length > 0) {
      setOnTimeout(() => {});
    } else {
      setOnTimeout(null);
    }
    return () => setOnTimeout(null);
  }, [meal, setOnTimeout]);

  const handleQuit = () => {
    if (user?.uid) {
      clearMeal(user.uid);
      removeDraft(user.uid);
    }
    dismissModal();
    navigation.replace("Home");
  };

  return (
    <>
      {children}
      <Modal
        visible={isModalVisible}
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
