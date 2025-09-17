import React, { useEffect, useRef, useState } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  DeviceEventEmitter,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import type { Ingredient } from "@/types";
import { PrimaryButton } from "./PrimaryButton";
import { ErrorButton } from "./ErrorButton";
import { useNavigation } from "@react-navigation/native";
import { IconButton } from "./IconButton";
import { Modal } from "./Modal";

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
  onChangePartial,
  errors = {},
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const navigation = useNavigation<any>();
  const unitLabel = (initial?.unit as any) === "ml" ? "ml" : "g";

  const [name, setName] = useState(initial.name ?? "");
  const [amount, setAmount] = useState(String(initial.amount ?? 0));
  const [protein, setProtein] = useState(String(initial.protein ?? 0));
  const [carbs, setCarbs] = useState(String(initial.carbs ?? 0));
  const [fat, setFat] = useState(String(initial.fat ?? 0));
  const [kcal, setKcal] = useState(String(initial.kcal ?? 0));

  const [nameTouched, setNameTouched] = useState(false);
  const [amountTouched, setAmountTouched] = useState(false);

  // Bazowa wartość do przeliczeń – zawsze z AKTUALNYCH pól
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
    // Jeśli keepAmount=true, nie nadpisuj poprzedniej ilości, żeby ratio liczyć względem poprzedniej ilości.
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
    // Ustaw bazę na podstawie aktualnych pól po pierwszym renderze
    syncBaselineFromState(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    if (key === "amount") {
      // Przed wywołaniem przeliczenia zsynchronizuj bazę z AKTUALNYMI makro
      // ale zostaw poprzednią ilość w baseline, aby ratio było poprawne.
      syncBaselineFromState(true);
      const prevAmt = baseline.current.amount;
      const nextAmt = Number.isFinite(n) ? n : 0;

      if (prevAmt > 0 && nextAmt > 0 && Math.abs(nextAmt - prevAmt) > 0.0001) {
        recalcRatioRef.current = nextAmt / prevAmt;
        setShowRecalc(true);
      } else {
        // Brak przeliczenia – aktualizuj ilość w bazie do bieżącej
        baseline.current.amount = nextAmt;
      }
    } else {
      // Aktualizacja bazowych makro do bieżącej wartości pola
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

  // Prefill z kodu kreskowego
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
        // Po wczytaniu z kodu ustaw bazę na te wartości
        baseline.current = {
          amount: Number(ing.amount ?? 100),
          protein: Number(ing.protein ?? 0),
          carbs: Number(ing.carbs ?? 0),
          fat: Number(ing.fat ?? 0),
          kcal: Number(ing.kcal ?? 0),
        };
      }
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
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          marginBottom: 8,
        }}
      >
        <IconButton
          icon={<Text style={{ color: theme.text }}>📷</Text>}
          onPress={() => navigation.navigate("BarCodeCamera")}
          accessibilityLabel={t("scan_barcode", {
            defaultValue: "Scan barcode",
          })}
        />
      </View>

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
        {String(t("amount", { ns: "meals" })).replace("[g]", `[${unitLabel}]`)}
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
            nextProtein * 4 + nextCarbs * 4 + nextFat * 9
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

          // Po potwierdzeniu baza = aktualne wartości i nowa ilość
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
