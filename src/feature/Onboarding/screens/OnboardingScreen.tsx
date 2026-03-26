import { useState, useEffect, useMemo } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { useTranslation } from "react-i18next";
import ProgressDots from "@/feature/Onboarding/components/ProgressDots";
import { Modal, Layout, IconButton } from "@/components";
import type { FormData, OnboardingMode, UserData } from "@/types";
import Step1BasicData from "@/feature/Onboarding/components/Step1BasicData";
import Step2Preferences from "@/feature/Onboarding/components/Step2Preferences";
import Step3Health from "@/feature/Onboarding/components/Step3Health";
import Step4AIAssistantPreferences from "@/feature/Onboarding/components/Step4AIAssistantPreferences";
import Step5Summary from "@/feature/Onboarding/components/Step5Summary";
import { useUserContext } from "@contexts/UserContext";
import { calculateCalorieTarget } from "../utils/calculateCalorieTarget";
import { assertNoUndefined } from "@/utils/findUndefined";
import type { StackScreenProps } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";

const STEPS = 5;

export const INITIAL_FORM: FormData = {
  unitsSystem: "metric",
  age: "",
  sex: "female",
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
  avatarLocalPath: "",
  aiFocus: "none",
  aiFocusOther: "",
  aiNote: "",
  surveyComplited: true,
  calorieTarget: 0,
};

type OnboardingScreenProps = StackScreenProps<RootStackParamList, "Onboarding">;

export default function OnboardingScreen({
  navigation,
  route,
}: OnboardingScreenProps) {
  const { t } = useTranslation("onboarding");
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { userData, updateUser, syncUserProfile } = useUserContext();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(
    {},
  );
  const [showExitModal, setShowExitModal] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const [editMode, setEditMode] = useState<{
    editing: boolean;
    returnStep: number;
  }>({
    editing: false,
    returnStep: STEPS,
  });

  const mode: OnboardingMode = useMemo(() => {
    const param = route.params?.mode;
    if (param) return param;
    if (userData?.surveyComplited) return "refill";
    return "first";
  }, [route.params?.mode, userData?.surveyComplited]);

  useEffect(() => {
    if (!navigation?.setOptions) return;
    if (mode === "first") {
      navigation.setOptions({ gestureEnabled: false });
    } else {
      navigation.setOptions({ gestureEnabled: true });
    }
  }, [navigation, mode]);

  useEffect(() => {
    if (userData) {
      setForm({
        ...INITIAL_FORM,
        ...userData,
        sex: userData.sex ?? "female",
      });
    }
    setIsLoaded(true);
  }, [userData]);

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
      const payload = {
        ...form,
        surveyComplited: true,
        avatarLocalPath: form.avatarLocalPath ?? "",
        calorieTarget: calculateCalorieTarget(form),
        surveyCompletedAt: new Date().toISOString(),
      } satisfies Partial<UserData>;
      assertNoUndefined(payload, "handleFinish payload");
      await updateUser(payload);
      await syncUserProfile();
      if (mode === "first") {
        navigation.replace("Home");
      } else {
        navigation.navigate("Profile");
      }
    } catch {
      // Keep user on onboarding if profile update fails.
    }
  };

  const handleExitPress = () => setShowExitModal(true);

  const exitPrimary = async () => {
    setShowExitModal(false);
    if (mode === "first") {
      navigation.reset({ index: 0, routes: [{ name: "Home" }] });
      return;
    }
    await handleFinish();
  };

  const exitSecondary = () => {
    setShowExitModal(false);
    if (mode === "refill") {
      navigation.navigate("Profile");
    }
  };

  const exitTitle =
    mode === "first" ? t("exit_first_title") : t("exit_refill_title");
  const exitDesc =
    mode === "first" ? t("exit_first_desc") : t("exit_refill_desc");
  const exitPrimaryLabel =
    mode === "first" ? t("exit_first_primary") : t("exit_refill_save");
  const exitSecondaryLabel =
    mode === "first" ? t("exit_first_secondary") : t("exit_refill_discard");

  if (!isLoaded) {
    return (
      <Layout showNavigation={false} disableScroll>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={theme.primary} />
          <Text style={styles.loadingText}>{t("common:loading")}</Text>
        </View>
      </Layout>
    );
  }

  return (
    <Layout
      showNavigation={false}
      disableScroll
    >
      {mode === "refill" && (
        <View style={styles.closeButtonWrap}>
          <IconButton
            icon={<AppIcon name="close" size={22} />}
            onPress={handleExitPress}
            accessibilityLabel={t("exit_refill_a11y")}
            iconColor={theme.text}
          />
        </View>
      )}
      <ProgressDots step={step} total={STEPS} />

      {step === 1 && (
        <Step1BasicData
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          onNext={editMode.editing ? confirmEdit : nextStep}
          onCancel={handleExitPress}
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
        visible={showExitModal}
        title={exitTitle}
        message={exitDesc}
        primaryAction={{
          label: exitPrimaryLabel,
          onPress: exitPrimary,
        }}
        secondaryAction={{
          label: exitSecondaryLabel,
          onPress: exitSecondary,
        }}
        onClose={() => setShowExitModal(false)}
      />
    </Layout>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    closeButtonWrap: {
      position: "absolute",
      right: 0,
      top: 0,
      transform: [{ translateX: 16 }, { translateY: -16 }],
      zIndex: 30,
      backgroundColor: "transparent",
      padding: theme.spacing.xs,
    },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: theme.spacing.sm,
    },
    loadingText: {
      color: theme.textSecondary,
    },
  });
