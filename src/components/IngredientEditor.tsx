import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  DeviceEventEmitter,
  Pressable,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import type { Ingredient } from "@/types";
import { PrimaryButton } from "./PrimaryButton";
import { ErrorButton } from "./ErrorButton";
import { NumberInput } from "./NumberInput";
import { useNavigation } from "@react-navigation/native";
import { Modal } from "./Modal";
import AppIcon from "@/components/AppIcon";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { RootStackParamList } from "@/navigation/navigate";

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

type NumericIngredientKey = "amount" | "protein" | "carbs" | "fat" | "kcal";

const AMOUNT_MAX_DECIMALS = 1;

export const IngredientEditor: React.FC<Props> = ({
  initial,
  onCommit,
  onCancel,
  onDelete,
  onChangePartial,
  errors = {},
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["meals", "common"]);
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const unitLabel = initial?.unit === "ml" ? "ml" : "g";

  const [name, setName] = useState(initial.name ?? "");
  const [amount, setAmount] = useState(String(initial.amount ?? 0));
  const [protein, setProtein] = useState(String(initial.protein ?? 0));
  const [carbs, setCarbs] = useState(String(initial.carbs ?? 0));
  const [fat, setFat] = useState(String(initial.fat ?? 0));
  const [kcal, setKcal] = useState(String(initial.kcal ?? 0));

  const [nameTouched, setNameTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  const baseline = useRef({
    amount: Number(initial.amount ?? 0),
    protein: Number(initial.protein ?? 0),
    carbs: Number(initial.carbs ?? 0),
    fat: Number(initial.fat ?? 0),
    kcal: Number(initial.kcal ?? 0),
  });

  const [showRecalc, setShowRecalc] = useState(false);
  const recalcRatioRef = useRef(1);

  const hasBlockingErrors = Object.keys(errors).length > 0;

  const syncBaselineFromState = (keepAmount = true) => {
    const amt = keepAmount ? baseline.current.amount : parseNum(amount) || 0;
    const p = parseNum(protein);
    const c = parseNum(carbs);
    const f = parseNum(fat);
    const k = parseNum(kcal);

    baseline.current = {
      amount: Number.isFinite(amt) ? amt : 0,
      protein: Number.isFinite(p) ? p : baseline.current.protein,
      carbs: Number.isFinite(c) ? c : baseline.current.carbs,
      fat: Number.isFinite(f) ? f : baseline.current.fat,
      kcal: Number.isFinite(k) ? k : baseline.current.kcal,
    };
  };

  useEffect(() => {
    syncBaselineFromState(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const commit = () => {
    if (hasBlockingErrors) return;

    onCommit({
      id: initial.id,
      name: name.trim(),
      amount: parseNum(amount) || 0,
      unit: initial.unit,
      protein: parseNum(protein) || 0,
      carbs: parseNum(carbs) || 0,
      fat: parseNum(fat) || 0,
      kcal: parseNum(kcal) || 0,
    });
  };

  const clearZeroOnFocus = (val: string, setter: (s: string) => void) => {
    if (val === "0" || val === "0.0" || val === "0,0") setter("");
  };

  const applyNumericPartial = (key: NumericIngredientKey, value: number) => {
    switch (key) {
      case "amount":
        onChangePartial?.({ amount: value });
        break;
      case "protein":
        onChangePartial?.({ protein: value });
        break;
      case "carbs":
        onChangePartial?.({ carbs: value });
        break;
      case "fat":
        onChangePartial?.({ fat: value });
        break;
      case "kcal":
        onChangePartial?.({ kcal: value });
        break;
    }
  };

  const getNumericMaxDecimals = (key: NumericIngredientKey) =>
    key === "amount" ? AMOUNT_MAX_DECIMALS : undefined;

  const handleNumericChange = (
    value: string,
    setter: (value: string) => void,
    key: NumericIngredientKey,
  ) => {
    setter(value);
    const numeric = parseNum(value);
    if (!Number.isNaN(numeric)) {
      applyNumericPartial(key, numeric);
    }
  };

  const handleNumericBlur = (
    key: NumericIngredientKey,
    normalizedValue: string,
  ) => {
    const n = parseNum(normalizedValue);
    if (!Number.isNaN(n)) applyNumericPartial(key, n);

    if (key === "amount") {
      syncBaselineFromState(true);
      const prevAmt = baseline.current.amount;
      const nextAmt = Number.isFinite(n) ? n : 0;

      if (prevAmt > 0 && nextAmt > 0 && Math.abs(nextAmt - prevAmt) > 0.0001) {
        recalcRatioRef.current = nextAmt / prevAmt;
        setShowRecalc(true);
      } else {
        baseline.current.amount = nextAmt;
      }
      return;
    }

    const num = Number.isFinite(n) ? n : 0;
    if (key === "protein") baseline.current.protein = num;
    if (key === "carbs") baseline.current.carbs = num;
    if (key === "fat") baseline.current.fat = num;
    if (key === "kcal") baseline.current.kcal = num;
  };

  const normalizeOnBlurName = (val: string) => {
    const next = val.trim();
    setName(next);
    onChangePartial?.({ name: next });
  };

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "barcode.scanned.ingredient",
      (payload: { ingredient: Ingredient }) => {
        const ing = payload?.ingredient;
        if (!ing) return;

        setName(ing.name || "");
        setAmount(String(ing.amount ?? 100));
        setProtein(String(ing.protein ?? 0));
        setCarbs(String(ing.carbs ?? 0));
        setFat(String(ing.fat ?? 0));
        setKcal(String(ing.kcal ?? 0));

        onChangePartial?.({
          name: ing.name || "",
          amount: ing.amount ?? 100,
          protein: ing.protein ?? 0,
          carbs: ing.carbs ?? 0,
          fat: ing.fat ?? 0,
          kcal: ing.kcal ?? 0,
        });

        baseline.current = {
          amount: Number(ing.amount ?? 100),
          protein: Number(ing.protein ?? 0),
          carbs: Number(ing.carbs ?? 0),
          fat: Number(ing.fat ?? 0),
          kcal: Number(ing.kcal ?? 0),
        };
      },
    );

    return () => sub.remove();
  }, [onChangePartial]);

  const inputStyle = (hasErr?: boolean, touched?: boolean) => [
    styles.input,
    hasErr && touched ? styles.inputError : null,
  ];

  return (
    <View style={styles.box}>
      <View style={styles.nameRow}>
        <RNTextInput
          style={[
            ...inputStyle(Boolean(errors.name), nameTouched),
            styles.nameInput,
          ]}
          value={name}
          onChangeText={(v) => {
            setName(v);
            onChangePartial?.({ name: v });
          }}
          placeholder={t("ingredient_name", { ns: "meals" })}
          placeholderTextColor={theme.input.placeholder}
          onBlur={() => {
            setNameTouched(true);
            normalizeOnBlurName(name);
          }}
        />

        <Pressable
          onPress={() =>
            navigation.navigate("AddMeal", {
              start: "MealCamera",
              barcodeOnly: true,
              returnTo: "Result",
              attempt: 1,
            })
          }
          style={styles.barcodeButton}
        >
          <AppIcon name="scan-barcode" size={22} color={theme.text} />
        </Pressable>
      </View>

      {errors.name && nameTouched ? (
        <Text style={styles.errText}>{errors.name}</Text>
      ) : null}

      <Text style={styles.editLabel}>
        {String(t("amount", { ns: "meals" })).replace("[g]", `[${unitLabel}]`)}
      </Text>
      <NumberInput
        variant="native"
        style={[
          styles.editInput,
          errors.amount && amountTouched ? styles.inputError : null,
        ]}
        value={amount}
        onChangeText={(v) => handleNumericChange(v, setAmount, "amount")}
        maxDecimals={getNumericMaxDecimals("amount")}
        blurFallback="0"
        placeholderTextColor={theme.input.placeholder}
        onFocus={() => clearZeroOnFocus(amount, setAmount)}
        onBlur={(normalizedValue) => {
          setAmountTouched(true);
          handleNumericBlur("amount", normalizedValue);
        }}
      />

      {errors.amount && amountTouched ? (
        <Text style={styles.errText}>{errors.amount}</Text>
      ) : null}

      <Text style={styles.editLabel}>{t("protein", { ns: "meals" })} [g]</Text>
      <NumberInput
        variant="native"
        style={[
          styles.editInput,
          styles.macroProteinInput,
          errors.protein ? styles.inputError : null,
        ]}
        value={protein}
        onChangeText={(v) => handleNumericChange(v, setProtein, "protein")}
        blurFallback="0"
        placeholderTextColor={theme.input.placeholder}
        onFocus={() => clearZeroOnFocus(protein, setProtein)}
        onBlur={(normalizedValue) =>
          handleNumericBlur("protein", normalizedValue)
        }
      />

      {errors.protein ? (
        <Text style={styles.errText}>{errors.protein}</Text>
      ) : null}

      <Text style={styles.editLabel}>{t("carbs", { ns: "meals" })} [g]</Text>
      <NumberInput
        variant="native"
        style={[
          styles.editInput,
          styles.macroCarbsInput,
          errors.carbs ? styles.inputError : null,
        ]}
        value={carbs}
        onChangeText={(v) => handleNumericChange(v, setCarbs, "carbs")}
        blurFallback="0"
        placeholderTextColor={theme.input.placeholder}
        onFocus={() => clearZeroOnFocus(carbs, setCarbs)}
        onBlur={(normalizedValue) =>
          handleNumericBlur("carbs", normalizedValue)
        }
      />

      {errors.carbs ? <Text style={styles.errText}>{errors.carbs}</Text> : null}

      <Text style={styles.editLabel}>{t("fat", { ns: "meals" })} [g]</Text>
      <NumberInput
        variant="native"
        style={[
          styles.editInput,
          styles.macroFatInput,
          errors.fat ? styles.inputError : null,
        ]}
        value={fat}
        onChangeText={(v) => handleNumericChange(v, setFat, "fat")}
        blurFallback="0"
        placeholderTextColor={theme.input.placeholder}
        onFocus={() => clearZeroOnFocus(fat, setFat)}
        onBlur={(normalizedValue) => handleNumericBlur("fat", normalizedValue)}
      />

      {errors.fat ? <Text style={styles.errText}>{errors.fat}</Text> : null}

      <Text style={styles.editLabel}>
        {t("calories", { ns: "meals" })} [kcal]
      </Text>
      <NumberInput
        variant="native"
        style={[styles.editInput, errors.kcal ? styles.inputError : null]}
        value={kcal}
        onChangeText={(v) => handleNumericChange(v, setKcal, "kcal")}
        blurFallback="0"
        placeholderTextColor={theme.input.placeholder}
        onFocus={() => clearZeroOnFocus(kcal, setKcal)}
        onBlur={(normalizedValue) => handleNumericBlur("kcal", normalizedValue)}
      />

      {errors.kcal ? <Text style={styles.errText}>{errors.kcal}</Text> : null}

      <PrimaryButton
        style={styles.primaryBtn}
        onPress={commit}
        disabled={hasBlockingErrors}
        label={t("save_changes", { ns: "common" })}
      />

      <ErrorButton
        style={styles.cancelBtn}
        onPress={onCancel}
        label={t("cancel", { ns: "common" })}
      />

      <Pressable onPress={onDelete} style={styles.deleteLink}>
        <Text style={styles.deleteLinkText}>
          {t("remove", { ns: "common", defaultValue: "Remove" })}
        </Text>
      </Pressable>

      <Modal
        visible={showRecalc}
        title={t("recalc_title", { defaultValue: "Recalculate values?" })}
        message={t("recalc_message", {
          defaultValue:
            "Adjust protein, carbs, fat and kcal proportionally to the new amount?",
        })}
        primaryAction={{
          label: t("confirm", {
            ns: "common",
            defaultValue: "Confirm",
          }),
          onPress: () => {
            const r = recalcRatioRef.current;
            const nextProtein = Number(
              (baseline.current.protein * r).toFixed(1),
            );
            const nextCarbs = Number((baseline.current.carbs * r).toFixed(1));
            const nextFat = Number((baseline.current.fat * r).toFixed(1));
            const kcalFromMacros = Math.round(
              nextProtein * 4 + nextCarbs * 4 + nextFat * 9,
            );
            const nextKcal =
              Math.round(baseline.current.kcal * r) || kcalFromMacros;

            setProtein(String(nextProtein));
            setCarbs(String(nextCarbs));
            setFat(String(nextFat));
            setKcal(String(nextKcal));

            onChangePartial?.({
              protein: nextProtein,
              carbs: nextCarbs,
              fat: nextFat,
              kcal: nextKcal,
            });

            baseline.current = {
              amount: parseNum(amount) || baseline.current.amount,
              protein: nextProtein,
              carbs: nextCarbs,
              fat: nextFat,
              kcal: nextKcal,
            };

            setShowRecalc(false);
          },
          tone: "primary",
        }}
        secondaryAction={{
          label: t("cancel", {
            ns: "common",
            defaultValue: "Cancel",
          }),
          onPress: () => {
            baseline.current.amount =
              parseNum(amount) || baseline.current.amount;
            setShowRecalc(false);
          },
          tone: "secondary",
        }}
        onClose={() => {
          baseline.current.amount = parseNum(amount) || baseline.current.amount;
          setShowRecalc(false);
        }}
      />
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    box: {
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      borderRadius: theme.rounded.lg,
      padding: theme.spacing.lg,
      marginBottom: theme.spacing.md,
    },
    nameRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: theme.spacing.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.input.border,
      backgroundColor: theme.input.background,
      color: theme.input.text,
      borderRadius: theme.rounded.md,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.xs,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      minHeight: 48,
    },
    inputError: {
      borderColor: theme.input.borderError,
    },
    nameInput: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    barcodeButton: {
      width: 44,
      height: 44,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceAlt,
      justifyContent: "center",
      alignItems: "center",
    },
    errText: {
      color: theme.error.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
      marginBottom: theme.spacing.sm,
    },
    primaryBtn: {
      marginTop: theme.spacing.sm,
    },
    cancelBtn: {
      marginTop: theme.spacing.sm,
    },
    editInput: {
      borderWidth: 1,
      borderColor: theme.input.border,
      backgroundColor: theme.input.background,
      color: theme.input.text,
      borderRadius: theme.rounded.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      minHeight: 48,
    },
    editLabel: {
      marginBottom: theme.spacing.xs,
      color: theme.textSecondary,
      fontSize: theme.typography.size.labelL,
      lineHeight: theme.typography.lineHeight.labelL,
      fontFamily: theme.typography.fontFamily.medium,
    },
    macroProteinInput: {
      color: theme.macro.protein,
      backgroundColor: theme.macro.proteinSoft,
      borderColor: theme.macro.protein,
    },
    macroCarbsInput: {
      color: theme.macro.carbs,
      backgroundColor: theme.macro.carbsSoft,
      borderColor: theme.macro.carbs,
    },
    macroFatInput: {
      color: theme.macro.fat,
      backgroundColor: theme.macro.fatSoft,
      borderColor: theme.macro.fat,
    },
    deleteLink: {
      alignSelf: "center",
      marginTop: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    deleteLinkText: {
      color: theme.error.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });
