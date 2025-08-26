import React, { useState } from "react";
import { View, TextInput, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import type { Ingredient } from "@/types";
import { PrimaryButton } from "./PrimaryButton";
import { ErrorButton } from "./ErrorButton";

type Props = {
  initial: Ingredient;
  onCommit: (i: Ingredient) => void;
  onCancel: () => void;
  onDelete: () => void;
  onChangePartial?: (patch: Partial<Ingredient>) => void;
  errors?: Partial<Record<keyof Ingredient, string>>;
};

const parseNum = (v: string) => {
  const n = parseFloat(v.replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
};

export const IngredientEditor: React.FC<Props> = ({
  initial,
  onCommit,
  onCancel,
  onDelete,
  onChangePartial,
  errors = {},
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);

  const [name, setName] = useState(initial.name ?? "");
  const [amount, setAmount] = useState(String(initial.amount ?? 0));
  const [protein, setProtein] = useState(String(initial.protein ?? 0));
  const [carbs, setCarbs] = useState(String(initial.carbs ?? 0));
  const [fat, setFat] = useState(String(initial.fat ?? 0));
  const [kcal, setKcal] = useState(String(initial.kcal ?? 0));

  const [nameTouched, setNameTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  const commit = () => {
    if (Object.keys(errors).length) return;
    onCommit({
      name: name.trim(),
      amount: parseNum(amount) || 0,
      protein: parseNum(protein) || 0,
      carbs: parseNum(carbs) || 0,
      fat: parseNum(fat) || 0,
      kcal: parseNum(kcal) || 0,
    });
  };

  const clearZeroOnFocus = (val: string, setter: (s: string) => void) => {
    if (val === "0" || val === "0.0" || val === "0,0") setter("");
  };

  const normalizeOnBlurNumber = (
    val: string,
    setter: (s: string) => void,
    key: keyof Ingredient
  ) => {
    const v = val.trim();
    const next = v === "" ? "0" : v;
    setter(next);
    const n = parseNum(next);
    if (!Number.isNaN(n)) onChangePartial?.({ [key]: n } as any);
  };

  const normalizeOnBlurName = (val: string) => {
    const v = val.trim();
    const next = v === "" ? "" : v;
    setName(next);
    onChangePartial?.({ name: next });
  };

  const inputStyle = (hasErr?: boolean, touched?: boolean) => [
    styles.input,
    {
      borderColor: hasErr && touched ? theme.error.border : theme.border,
      color: theme.text,
      backgroundColor: theme.mode === "dark" ? theme.card : theme.background,
    },
  ];

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          borderRadius: theme.rounded.md,
          padding: theme.spacing.md,
        },
      ]}
    >
      <TextInput
        style={inputStyle(Boolean(errors.name), nameTouched)}
        value={name}
        onChangeText={(v) => {
          setName(v);
          onChangePartial?.({ name: v });
        }}
        placeholder={t("ingredient_name", { ns: "meals" })}
        placeholderTextColor={theme.textSecondary}
        onBlur={() => {
          setNameTouched(true);
          normalizeOnBlurName(name);
        }}
      />
      {errors.name && nameTouched ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.name}
        </Text>
      ) : null}

      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
        {t("amount", { ns: "meals" })}
      </Text>
      <TextInput
        style={[
          styles.editInput,
          {
            color: theme.text,
            borderColor:
              errors.amount && amountTouched ? theme.error.text : theme.border,
          },
        ]}
        keyboardType="numeric"
        value={amount}
        onChangeText={(v) => {
          setAmount(v);
          const n = parseNum(v);
          if (!Number.isNaN(n)) onChangePartial?.({ amount: n });
        }}
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(amount, setAmount)}
        onBlur={() => {
          setAmountTouched(true);
          normalizeOnBlurNumber(amount, setAmount, "amount");
        }}
      />
      {errors.amount && amountTouched ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.amount}
        </Text>
      ) : null}

      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
        {t("protein", { ns: "meals" })} [g]
      </Text>
      <TextInput
        style={[
          styles.editInput,
          {
            color: theme.macro.protein,
            backgroundColor: theme.macro.protein + "24",
            borderWidth: 1,
            borderColor: errors.protein
              ? theme.error.text
              : theme.macro.protein,
          },
        ]}
        keyboardType="numeric"
        value={protein}
        onChangeText={(v) => {
          setProtein(v);
          const n = parseNum(v);
          if (!Number.isNaN(n)) onChangePartial?.({ protein: n });
        }}
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(protein, setProtein)}
        onBlur={() => normalizeOnBlurNumber(protein, setProtein, "protein")}
      />
      {errors.protein ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.protein}
        </Text>
      ) : null}

      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
        {t("carbs", { ns: "meals" })} [g]
      </Text>
      <TextInput
        style={[
          styles.editInput,
          {
            color: theme.macro.carbs,
            backgroundColor: theme.macro.carbs + "24",
            borderWidth: 1,
            borderColor: errors.carbs ? theme.error.text : theme.macro.carbs,
          },
        ]}
        keyboardType="numeric"
        value={carbs}
        onChangeText={(v) => {
          setCarbs(v);
          const n = parseNum(v);
          if (!Number.isNaN(n)) onChangePartial?.({ carbs: n });
        }}
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(carbs, setCarbs)}
        onBlur={() => normalizeOnBlurNumber(carbs, setCarbs, "carbs")}
      />
      {errors.carbs ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.carbs}
        </Text>
      ) : null}

      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
        {t("fat", { ns: "meals" })} [g]
      </Text>
      <TextInput
        style={[
          styles.editInput,
          {
            color: theme.macro.fat,
            backgroundColor: theme.macro.fat + "24",
            borderWidth: 1,
            borderColor: errors.fat ? theme.error.text : theme.macro.fat,
          },
        ]}
        keyboardType="numeric"
        value={fat}
        onChangeText={(v) => {
          setFat(v);
          const n = parseNum(v);
          if (!Number.isNaN(n)) onChangePartial?.({ fat: n });
        }}
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(fat, setFat)}
        onBlur={() => normalizeOnBlurNumber(fat, setFat, "fat")}
      />
      {errors.fat ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.fat}
        </Text>
      ) : null}

      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
        {t("calories", { ns: "meals" })} [kcal]
      </Text>
      <TextInput
        style={[
          styles.editInput,
          {
            color: theme.text,
            borderColor: errors.kcal ? theme.error.text : theme.border,
          },
        ]}
        keyboardType="numeric"
        value={kcal}
        onChangeText={(v) => {
          setKcal(v);
          const n = parseNum(v);
          if (!Number.isNaN(n)) onChangePartial?.({ kcal: n });
        }}
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(kcal, setKcal)}
        onBlur={() => normalizeOnBlurNumber(kcal, setKcal, "kcal")}
      />
      {errors.kcal ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.kcal}
        </Text>
      ) : null}

      <PrimaryButton
        style={styles.primaryBtn}
        onPress={commit}
        disabled={Object.keys(errors).length > 0}
      >
        <Text style={[styles.saveBtnText, { color: theme.onAccent }]}>
          {t("save_changes", { ns: "common" })}
        </Text>
      </PrimaryButton>

      <ErrorButton
        style={[styles.outlineBtn, { borderColor: theme.error.border }]}
        onPress={onCancel}
        label={t("cancel", { ns: "common" })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  box: { borderWidth: 1, marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    fontSize: 16,
  },
  errText: { fontSize: 12, marginBottom: 8 },
  primaryBtn: { marginVertical: 8 },
  outlineBtn: {
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
  },
  editInput: {
    borderWidth: 1.2,
    backgroundColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 7,
    fontSize: 16,
  },
  editLabel: { marginBottom: 5, fontSize: 15, fontWeight: "600" },
  saveBtnText: { fontWeight: "bold", fontSize: 16 },
});
