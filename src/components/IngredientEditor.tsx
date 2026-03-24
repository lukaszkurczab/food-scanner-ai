import React, { useEffect, useRef, useState } from "react";
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
  onChangePartial,
  errors = {},
}) => {
  const theme = useTheme();
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
    if (Object.keys(errors).length) return;
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
    } else {
      const num = Number.isFinite(n) ? n : 0;
      if (key === "protein") baseline.current.protein = num;
      if (key === "carbs") baseline.current.carbs = num;
      if (key === "fat") baseline.current.fat = num;
      if (key === "kcal") baseline.current.kcal = num;
    }
  };

  const normalizeOnBlurName = (val: string) => {
    const v = val.trim();
    const next = v === "" ? "" : v;
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
      <View style={styles.nameRow}>
        <RNTextInput
          style={[
            inputStyle(Boolean(errors.name), nameTouched),
            styles.nameInput,
          ]}
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

        <Pressable
          onPress={() =>
            navigation.navigate("AddMeal", {
              start: "MealCamera",
              barcodeOnly: true,
              returnTo: "Result",
              attempt: 1,
            })
          }
          style={[
            styles.barcodeButton,
            { borderColor: theme.border, backgroundColor: theme.card },
          ]}
        >
          <AppIcon name="scan-barcode" size={22} color={theme.text} />
        </Pressable>
      </View>

      {errors.name && nameTouched ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.name}
        </Text>
      ) : null}

      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
        {String(t("amount", { ns: "meals" })).replace("[g]", `[${unitLabel}]`)}
      </Text>
      <NumberInput
        variant="native"
        style={[
          styles.editInput,
          {
            color: theme.text,
            borderColor:
              errors.amount && amountTouched ? theme.error.text : theme.border,
          },
        ]}
        value={amount}
        onChangeText={(v) => handleNumericChange(v, setAmount, "amount")}
        maxDecimals={getNumericMaxDecimals("amount")}
        blurFallback="0"
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(amount, setAmount)}
        onBlur={(normalizedValue) => {
          setAmountTouched(true);
          handleNumericBlur("amount", normalizedValue);
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
      <NumberInput
        variant="native"
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
        value={protein}
        onChangeText={(v) => handleNumericChange(v, setProtein, "protein")}
        blurFallback="0"
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(protein, setProtein)}
        onBlur={(normalizedValue) =>
          handleNumericBlur("protein", normalizedValue)
        }
      />

      {errors.protein ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.protein}
        </Text>
      ) : null}

      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
        {t("carbs", { ns: "meals" })} [g]
      </Text>
      <NumberInput
        variant="native"
        style={[
          styles.editInput,
          {
            color: theme.macro.carbs,
            backgroundColor: theme.macro.carbs + "24",
            borderWidth: 1,
            borderColor: errors.carbs ? theme.error.text : theme.macro.carbs,
          },
        ]}
        value={carbs}
        onChangeText={(v) => handleNumericChange(v, setCarbs, "carbs")}
        blurFallback="0"
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(carbs, setCarbs)}
        onBlur={(normalizedValue) =>
          handleNumericBlur("carbs", normalizedValue)
        }
      />

      {errors.carbs ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.carbs}
        </Text>
      ) : null}

      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
        {t("fat", { ns: "meals" })} [g]
      </Text>
      <NumberInput
        variant="native"
        style={[
          styles.editInput,
          {
            color: theme.macro.fat,
            backgroundColor: theme.macro.fat + "24",
            borderWidth: 1,
            borderColor: errors.fat ? theme.error.text : theme.macro.fat,
          },
        ]}
        value={fat}
        onChangeText={(v) => handleNumericChange(v, setFat, "fat")}
        blurFallback="0"
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(fat, setFat)}
        onBlur={(normalizedValue) => handleNumericBlur("fat", normalizedValue)}
      />

      {errors.fat ? (
        <Text style={[styles.errText, { color: theme.error.text }]}>
          {errors.fat}
        </Text>
      ) : null}

      <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
        {t("calories", { ns: "meals" })} [kcal]
      </Text>
      <NumberInput
        variant="native"
        style={[
          styles.editInput,
          {
            color: theme.text,
            borderColor: errors.kcal ? theme.error.text : theme.border,
          },
        ]}
        value={kcal}
        onChangeText={(v) => handleNumericChange(v, setKcal, "kcal")}
        blurFallback="0"
        placeholderTextColor={theme.textSecondary}
        onFocus={() => clearZeroOnFocus(kcal, setKcal)}
        onBlur={(normalizedValue) => handleNumericBlur("kcal", normalizedValue)}
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

      <Modal
        visible={showRecalc}
        title={t("recalc_title", { defaultValue: "Recalculate values?" })}
        message={t("recalc_message", {
          defaultValue:
            "Adjust protein, carbs, fat and kcal proportionally to the new amount?",
        })}
        primaryActionLabel={t("confirm", {
          ns: "common",
          defaultValue: "Confirm",
        })}
        onPrimaryAction={() => {
          const r = recalcRatioRef.current;
          const nextProtein = Number((baseline.current.protein * r).toFixed(1));
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
        }}
        secondaryActionLabel={t("cancel", {
          ns: "common",
          defaultValue: "Cancel",
        })}
        onSecondaryAction={() => {
          baseline.current.amount = parseNum(amount) || baseline.current.amount;
          setShowRecalc(false);
        }}
        onClose={() => {
          baseline.current.amount = parseNum(amount) || baseline.current.amount;
          setShowRecalc(false);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  box: { borderWidth: 1, marginBottom: 16 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
    fontSize: 16,
  },
  nameInput: {
    flex: 1,
    marginRight: 8,
  },
  barcodeButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errText: { fontSize: 12, marginBottom: 8 },
  primaryBtn: { marginVertical: 8 },
  outlineBtn: {
    padding: 12,
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
