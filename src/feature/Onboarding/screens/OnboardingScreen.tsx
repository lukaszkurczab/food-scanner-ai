import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import * as SecureStore from "expo-secure-store";
import ProgressDots from "@/src/feature/Onboarding/components/ProgressDots";
import { useSoftSave } from "@/src/feature/Onboarding/hooks/hookSoftSave";
import { Modal, Layout } from "@/src/components";
import { FormData } from "@/src/types/onboarding";
import Step1BasicData from "@/src/feature/Onboarding/components/Step1BasicData";
import Step2Preferences from "@/src/feature/Onboarding/components/Step2Preferences";
import Step3Health from "@/src/feature/Onboarding/components/Step3Health";
import Step4AIAssistantPreferences from "@/src/feature/Onboarding/components/Step4AIAssistantPreferences";
import Step5Summary from "@/src/feature/Onboarding/components/Step5Summary";
import { useUserContext } from "@/src/context/UserContext";

const ONBOARDING_DRAFT_KEY = "onboardingDraft";
const STEPS = 5;

const INITIAL_FORM: FormData = {
  unitsSystem: "metric",
  age: "",
  sex: "male",
  height: "",
  weight: "",
  preferences: [],
  activityLevel: "moderate",
  goal: "maintain",
  calorieDeficit: 0.3,
  calorieSurplus: 0.3,
  chronicDiseases: [],
  chronicDiseasesOther: "",
  allergies: [],
  allergiesOther: "",
  lifestyle: "",
  aiStyle: "none",
  aiFocus: "none",
  aiFocusOther: "",
  aiNote: "",
};

export default function OnboardingScreen({ navigation }: any) {
  const { t } = useTranslation("onboarding");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [editMode, setEditMode] = useState<{
    editing: boolean;
    returnStep: number;
  }>({
    editing: false,
    returnStep: STEPS,
  });

  useEffect(() => {
    (async () => {
      try {
        const draft = await SecureStore.getItemAsync(ONBOARDING_DRAFT_KEY);
        if (draft) {
          setForm(JSON.parse(draft));
        }
      } catch (err) {}
      setIsLoaded(true);
    })();
  }, []);

  useSoftSave<FormData>(ONBOARDING_DRAFT_KEY, form, setForm);

  const { saveSurvey, syncSurvey } = useUserContext();

  const nextStep = () => setStep((s) => Math.min(STEPS, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const goToStep = (stepNumber: number) => {
    setEditMode({ editing: true, returnStep: STEPS });
    setStep(stepNumber);
  };

  const confirmEdit = () => {
    setEditMode({ editing: false, returnStep: STEPS });
    setStep(STEPS);
  };

  const handleFinish = async () => {
    try {
      await saveSurvey(form);
      await syncSurvey();
      await SecureStore.deleteItemAsync(ONBOARDING_DRAFT_KEY);
      navigation.replace("Home");
    } catch (err) {
      console.log(form);
      console.error(err);
    }
  };

  const handleCancel = () => setShowCancelModal(true);
  const confirmCancel = () => {
    setShowCancelModal(false);
    SecureStore.deleteItemAsync(ONBOARDING_DRAFT_KEY);
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  if (!isLoaded) return null;

  return (
    <Layout>
      <ProgressDots step={step} total={STEPS} />
      {step === 1 && (
        <Step1BasicData
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          onNext={editMode.editing ? confirmEdit : nextStep}
          onCancel={handleCancel}
          editMode={editMode.editing}
          onConfirmEdit={confirmEdit}
        />
      )}
      {step === 2 && (
        <Step2Preferences
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          onNext={editMode.editing ? confirmEdit : nextStep}
          onBack={editMode.editing ? () => setStep(1) : prevStep}
          editMode={editMode.editing}
          onConfirmEdit={confirmEdit}
        />
      )}
      {step === 3 && (
        <Step3Health
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          onNext={editMode.editing ? confirmEdit : nextStep}
          onBack={editMode.editing ? () => setStep(2) : prevStep}
          editMode={editMode.editing}
          onConfirmEdit={confirmEdit}
        />
      )}
      {step === 4 && (
        <Step4AIAssistantPreferences
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          onNext={editMode.editing ? confirmEdit : nextStep}
          onBack={editMode.editing ? () => setStep(3) : prevStep}
          editMode={editMode.editing}
          onConfirmEdit={confirmEdit}
        />
      )}
      {step === 5 && (
        <Step5Summary
          form={form}
          goToStep={goToStep}
          onFinish={handleFinish}
          onBack={prevStep}
        />
      )}
      <Modal
        visible={showCancelModal}
        title={t("cancelTitle")}
        message={t("cancelDesc")}
        primaryActionLabel={t("cancelConfirm")}
        onPrimaryAction={confirmCancel}
        secondaryActionLabel={t("cancelDismiss")}
        onSecondaryAction={() => setShowCancelModal(false)}
        onClose={() => setShowCancelModal(false)}
      />
    </Layout>
  );
}
