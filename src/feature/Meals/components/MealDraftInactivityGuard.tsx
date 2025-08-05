import React, { useEffect } from "react";
import { useMealContext } from "@/src/context/MealContext";
import { useInactivity } from "@/src/context/InactivityContext";
import { useNavigation } from "@react-navigation/native";
import { Modal } from "@/src/components/";

export const MealDraftInactivityGuard = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { meal, clearMeal, removeDraft } = useMealContext();
  const { isModalVisible, setOnTimeout, dismissModal } = useInactivity();
  const navigation = useNavigation<any>();

  useEffect(() => {
    if (meal && meal.ingredients.length > 0) {
      setOnTimeout(() => {});
    } else {
      setOnTimeout(null);
    }
    return () => setOnTimeout(null);
  }, [meal, setOnTimeout]);

  const handleQuit = () => {
    clearMeal();
    removeDraft();
    dismissModal();
    navigation.replace("Home");
  };

  return (
    <>
      {children}
      <Modal
        visible={isModalVisible}
        title="Are you still there?"
        message="Your draft will be removed due to inactivity. Do you want to continue editing or quit?"
        secondaryActionLabel="Quit"
        onSecondaryAction={handleQuit}
        primaryActionLabel="Continue"
        onPrimaryAction={dismissModal}
        onClose={dismissModal}
      />
    </>
  );
};
