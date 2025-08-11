import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton, SecondaryButton, IconButton } from "@/components";
import { FormData } from "@/types";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type Props = {
  form: FormData;
  goToStep: (step: number) => void;
  onFinish: () => void;
  onBack: () => void;
};

function parseArray(val: any): string[] {
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default function Step5Summary({
  form,
  goToStep,
  onFinish,
  onBack,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation("onboarding");

  const preferences: string[] = parseArray(form.preferences);
  const allergies: string[] = parseArray(form.allergies);
  const chronicDiseases: string[] = parseArray(form.chronicDiseases);

  function renderHeight() {
    if (form.unitsSystem === "imperial") {
      const feet = form.height;
      const inches = form.heightInch || "0";
      return `${feet} ft ${inches} in`;
    }
    return `${form.height} cm`;
  }

  function renderWeight() {
    if (form.unitsSystem === "imperial") {
      return `${form.weight} lbs`;
    }
    return `${form.weight} kg`;
  }

  function renderSex() {
    if (form.sex === "male" || form.sex === "female") {
      return t(`sex.${form.sex}`);
    }
    return t("none");
  }

  const summary = [
    {
      title: t("summary.personalInfo"),
      step: 1,
      data: [
        { label: t("age"), value: form.age || t("none") },
        { label: t("sex"), value: renderSex() },
        { label: t("height"), value: renderHeight() },
        { label: t("weight"), value: renderWeight() },
      ],
    },
    {
      title: t("summary.dietGoal"),
      step: 2,
      data: [
        {
          label: t("preferences.label"),
          value: preferences.length
            ? preferences.map((p) => t(`preferences.${p}`)).join(", ")
            : t("preferences.none"),
        },
        {
          label: t("activityLevel"),
          value: form.activityLevel
            ? t(`activity.${form.activityLevel}`)
            : t("none"),
        },
        {
          label: t("goalTitle"),
          value: form.goal ? t(`goal.${form.goal}`) : t("none"),
        },
        ...(form.goal === "lose"
          ? [
              {
                label: t("calorieDeficit"),
                value: `${Math.round((form.calorieDeficit ?? 0) * 100)}%`,
              },
            ]
          : form.goal === "increase"
          ? [
              {
                label: t("calorieSurplus"),
                value: `${Math.round((form.calorieSurplus ?? 0) * 100)}%`,
              },
            ]
          : []),
      ],
    },
    {
      title: t("summary.health"),
      step: 3,
      data: [
        {
          label: t("healthProfile.chronicDisease"),
          value: chronicDiseases.length
            ? chronicDiseases
                .map((d) =>
                  d === "other"
                    ? form.chronicDiseasesOther
                      ? form.chronicDiseasesOther
                      : t("none")
                    : t(`healthProfile.disease.${d}`)
                )
                .join(", ")
            : t("none"),
        },
        {
          label: t("healthProfile.allergies"),
          value: allergies.length
            ? allergies
                .map((a) =>
                  a === "other"
                    ? form.allergiesOther
                      ? form.allergiesOther
                      : t("none")
                    : t(`healthProfile.allergy.${a}`)
                )
                .join(", ")
            : t("none"),
        },
        {
          label: t("healthProfile.lifestyle"),
          value: form.lifestyle || t("none"),
        },
      ],
    },
    {
      title: t("summary.ai"),
      step: 4,
      data: [
        {
          label: t("ai.assistantStyle"),
          value: form.aiStyle ? t(`ai.style.${form.aiStyle}`) : t("none"),
        },
        {
          label: t("ai.areaOfFocus"),
          value:
            form.aiFocus === "other"
              ? form.aiFocusOther || t("none")
              : form.aiFocus
              ? t(`ai.focus.${form.aiFocus}`)
              : t("none"),
        },
        {
          label: t("ai.anythingElse"),
          value: form.aiNote || t("none"),
        },
      ],
    },
  ];

  return (
    <View>
      <View style={{ marginBottom: theme.spacing.xl }}>
        <Text
          style={{
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.xxl,
            color: theme.text,
            textAlign: "center",
            marginBottom: theme.spacing.md,
          }}
        >
          {t("summary.title")}
        </Text>
        <Text
          style={{
            color: theme.textSecondary,
            fontSize: theme.typography.size.base,
            textAlign: "center",
          }}
        >
          {t("summary.desc")}
        </Text>
      </View>

      {summary.map((section) => (
        <View
          key={section.title}
          style={{
            backgroundColor: theme.card,
            borderRadius: theme.rounded.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 12,
            elevation: 3,
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text
              style={{
                fontFamily: theme.typography.fontFamily.bold,
                fontSize: theme.typography.size.lg,
                color: theme.text,
                flex: 1,
              }}
            >
              {section.title}
            </Text>
            <IconButton
              icon={
                <MaterialIcons
                  name="edit"
                  size={22}
                  color={theme.accentSecondary}
                />
              }
              onPress={() => goToStep(section.step)}
              accessibilityLabel={t("summary.edit")}
              style={{
                marginLeft: theme.spacing.sm,
                backgroundColor: "transparent",
                padding: 0,
                minHeight: 0,
                minWidth: 0,
              }}
            />
          </View>
          <View style={{ marginTop: theme.spacing.md }}>
            {section.data.map((item, i) => (
              <View
                key={item.label + i}
                style={{
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  paddingVertical: 12,
                  borderBottomWidth:
                    i < section.data.length - 1 ? StyleSheet.hairlineWidth : 0,
                  borderBottomColor: theme.border,
                }}
              >
                <Text
                  style={{
                    fontFamily: theme.typography.fontFamily.bold,
                    color: theme.text,
                    fontSize: theme.typography.size.base,
                  }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    color: theme.text,
                    fontSize: theme.typography.size.base,
                    fontFamily: theme.typography.fontFamily.regular,
                  }}
                >
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <PrimaryButton
        label={t("summary.finish")}
        onPress={onFinish}
        style={{
          marginBottom: theme.spacing.md,
        }}
      />
      <SecondaryButton label={t("back")} onPress={onBack} />
    </View>
  );
}
