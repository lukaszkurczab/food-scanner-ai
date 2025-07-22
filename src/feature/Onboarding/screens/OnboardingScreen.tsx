import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import * as SecureStore from "expo-secure-store";
import ProgressDots from "@/src/feature/Onboarding/components/ProgressDots";
import Step1BasicData from "@/src/feature/Onboarding/components/Step1BasicData";
import { useSoftSave } from "@/src/feature/Onboarding/hooks/hookSoftSave";
import { Modal, Layout } from "@/src/components";

const ONBOARDING_DRAFT_KEY = "onboardingDraft";
const STEPS = 5;

type UnitsSystem = "metric" | "imperial";
type Sex = "male" | "female" | null;

type FormData = {
  unitsSystem: UnitsSystem;
  age: string;
  sex: Sex;
  height: string;
  heightInch?: string;
  weight: string;
};

const INITIAL_FORM: FormData = {
  unitsSystem: "metric",
  age: "",
  sex: null,
  height: "",
  weight: "",
};

export default function OnboardingScreen({ navigation }: any) {
  const { t } = useTranslation("onboarding");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {}
  );
  const [showCancelModal, setShowCancelModal] = useState(false);

  useSoftSave<FormData>(ONBOARDING_DRAFT_KEY, form, setForm);

  const nextStep = () => setStep((s) => Math.min(STEPS, s + 1));
  const prevStep = () => setStep((s) => Math.max(1, s - 1));

  const handleFinish = () => {
    navigation.replace("Home");
  };

  const handleCancel = () => setShowCancelModal(true);
  const confirmCancel = () => {
    setShowCancelModal(false);
    SecureStore.deleteItemAsync(ONBOARDING_DRAFT_KEY);
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <Layout>
      <ProgressDots step={step} total={STEPS} />
      {step === 1 && (
        <Step1BasicData
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          onNext={nextStep}
          onCancel={handleCancel}
        />
      )}
      {/* {step === 2 && <Step2X ... />} */}
      {/* ... kolejne kroki */}
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
