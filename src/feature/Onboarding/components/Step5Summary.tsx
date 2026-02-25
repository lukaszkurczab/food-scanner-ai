import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton, SecondaryButton, IconButton } from "@/components";
import { FormData } from "@/types";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { cmToFtIn, kgToLbs } from "@utils/units";

type Props = {
  form: FormData;
  goToStep: (step: number) => void;
  onFinish: () => void;
  onBack: () => void;
};

function parseArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.filter((item): item is string => typeof item === "string");
  if (typeof val === "string") {
    try {
      const arr = JSON.parse(val);
      return Array.isArray(arr)
        ? arr.filter((item): item is string => typeof item === "string")
        : [];
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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("onboarding");

  const preferences: string[] = parseArray(form.preferences);
  const allergies: string[] = parseArray(form.allergies);
  const chronicDiseases: string[] = parseArray(form.chronicDiseases);

  function renderHeight() {
    const cm = Number(form.height || 0);
    if (form.unitsSystem === "imperial") {
      const { ft, inch } = cmToFtIn(cm);
      return `${ft} ft ${inch} in`;
    }
    return `${cm || ""} cm`;
  }

  function renderWeight() {
    const kg = Number(form.weight || 0);
    if (form.unitsSystem === "imperial") {
      return `${kg ? kgToLbs(kg) : ""} lbs`;
    }
    return `${kg || ""} kg`;
  }

  function renderSex() {
    if (form.sex === "male" || form.sex === "female") {
      return t(`${form.sex}`);
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
                    : t(`healthProfile.disease.${d}`),
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
                    : t(`healthProfile.allergy.${a}`),
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
      <View style={styles.header}>
        <Text style={styles.title}>
          {t("summary.title")}
        </Text>
        <Text style={styles.subtitle}>
          {t("summary.desc")}
        </Text>
      </View>

      {summary.map((section) => (
        <View
          key={section.title}
          style={styles.card}
        >
          <View style={styles.rowCenter}>
            <Text style={styles.sectionTitle}>
              {section.title}
            </Text>
            <IconButton
              icon={<MaterialIcons name="edit" size={22} />}
              onPress={() => goToStep(section.step)}
              accessibilityLabel={t("summary.edit")}
              style={styles.editButton}
            />
          </View>
          <View style={styles.sectionBody}>
            {section.data.map((item, i) => (
              <View
                key={item.label + i}
                style={[
                  styles.rowBetween,
                  i < section.data.length - 1 && styles.rowDivider,
                ]}
              >
                <Text style={styles.itemLabel}>
                  {item.label}
                </Text>
                <Text style={styles.itemValue}>
                  {item.value}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ))}

      <PrimaryButton
        label={t("summary.save")}
        onPress={onFinish}
        style={styles.saveSpacing}
      />
      <SecondaryButton label={t("back")} onPress={onBack} />
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    header: { marginBottom: theme.spacing.xl },
    title: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.xxl,
      color: theme.text,
      textAlign: "center",
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.base,
      textAlign: "center",
    },
    card: {
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
    },
    rowCenter: { flexDirection: "row", alignItems: "center" },
    sectionTitle: {
      fontFamily: theme.typography.fontFamily.bold,
      fontSize: theme.typography.size.lg,
      color: theme.text,
      flex: 1,
    },
    editButton: {
      marginLeft: theme.spacing.sm,
      backgroundColor: "transparent",
      padding: 0,
      minHeight: 0,
      minWidth: 0,
    },
    sectionBody: { marginTop: theme.spacing.md },
    rowBetween: {
      justifyContent: "space-between",
      alignItems: "flex-start",
      paddingVertical: theme.spacing.sm,
    },
    rowDivider: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.border,
    },
    itemLabel: {
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
      fontSize: theme.typography.size.base,
    },
    itemValue: {
      color: theme.text,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.regular,
    },
    saveSpacing: { marginBottom: theme.spacing.md },
  });
