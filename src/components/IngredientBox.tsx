import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import type { Ingredient } from "@/types";
import { MacroChip } from "./MacroChip";
import { useTranslation } from "react-i18next";

type IngredientBoxProps = {
  ingredient: Ingredient;
  editable?: boolean;
  initialEdit?: boolean;
  onSave?: (ingredient: Ingredient) => void;
  onRemove?: () => void;
  onCancelEdit?: () => void;
};

type FieldErrors = {
  name?: string;
  amount?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  kcal?: string;
};

export const IngredientBox: React.FC<IngredientBoxProps> = ({
  ingredient,
  editable = true,
  initialEdit = false,
  onSave,
  onRemove,
  onCancelEdit,
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);

  const [menuVisible, setMenuVisible] = useState(false);
  const [editMode, setEditMode] = useState<boolean>(initialEdit);
  const [edited, setEdited] = useState<Ingredient>(ingredient);

  const [amountStr, setAmountStr] = useState(String(ingredient.amount));
  const [proteinStr, setProteinStr] = useState(String(ingredient.protein));
  const [carbsStr, setCarbsStr] = useState(String(ingredient.carbs));
  const [fatStr, setFatStr] = useState(String(ingredient.fat));
  const [kcalStr, setKcalStr] = useState(String(ingredient.kcal));

  const [errors, setErrors] = useState<FieldErrors>({});

  const initial = useRef(ingredient);
  const menuAnchor = useRef<View>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setEditMode(initialEdit);
  }, [initialEdit]);

  useEffect(() => {
    initial.current = ingredient;
    setEdited(ingredient);
    setAmountStr(String(ingredient.amount));
    setProteinStr(String(ingredient.protein));
    setCarbsStr(String(ingredient.carbs));
    setFatStr(String(ingredient.fat));
    setKcalStr(String(ingredient.kcal));
    setErrors({});
  }, [ingredient]);

  const setFieldError = (field: keyof FieldErrors, msg?: string) =>
    setErrors((e) => ({ ...e, [field]: msg }));

  const handleAmountChange = (val: string) => {
    setAmountStr(val);
    const n = parseFloat(val.replace(",", "."));
    if (val === "" || isNaN(n) || n <= 0) {
      setEdited({ ...edited, amount: 0 });
      setFieldError(
        "amount",
        t("ingredient_invalid_values", {
          ns: "meals",
          defaultValue:
            "Values must be non-negative and amount must be greater than 0",
        })
      );
      return;
    }
    setFieldError("amount", undefined);
    const base = initial.current.amount || 1;
    const factor = n / base;
    const p = Math.round((initial.current.protein || 0) * factor);
    const c = Math.round((initial.current.carbs || 0) * factor);
    const f = Math.round((initial.current.fat || 0) * factor);
    const k = Math.round((initial.current.kcal || 0) * factor);
    setEdited({ ...edited, amount: n, protein: p, carbs: c, fat: f, kcal: k });
    setProteinStr(String(p));
    setCarbsStr(String(c));
    setFatStr(String(f));
    setKcalStr(String(k));
    setFieldError("protein", undefined);
    setFieldError("carbs", undefined);
    setFieldError("fat", undefined);
    setFieldError("kcal", undefined);
  };

  const handleBlur = (field: keyof Ingredient, value: string) => {
    const num = parseFloat(value.replace(",", "."));
    const v = value === "" || isNaN(num) ? 0 : num;
    setEdited((prev) => ({ ...prev, [field]: v }));
    if (field === "amount") {
      setAmountStr(String(v));
      setFieldError(
        "amount",
        v > 0
          ? undefined
          : t("ingredient_invalid_values", {
              ns: "meals",
              defaultValue:
                "Values must be non-negative and amount must be greater than 0",
            })
      );
    }
    if (field === "protein") {
      setProteinStr(String(v));
      setFieldError(
        "protein",
        v >= 0 ? undefined : t("ingredient_invalid_values", { ns: "meals" })
      );
    }
    if (field === "carbs") {
      setCarbsStr(String(v));
      setFieldError(
        "carbs",
        v >= 0 ? undefined : t("ingredient_invalid_values", { ns: "meals" })
      );
    }
    if (field === "fat") {
      setFatStr(String(v));
      setFieldError(
        "fat",
        v >= 0 ? undefined : t("ingredient_invalid_values", { ns: "meals" })
      );
    }
    if (field === "kcal") {
      setKcalStr(String(v));
      setFieldError(
        "kcal",
        v >= 0 ? undefined : t("ingredient_invalid_values", { ns: "meals" })
      );
    }
  };

  const handleProteinChange = (val: string) => {
    setProteinStr(val);
    const n = parseFloat(val.replace(",", "."));
    setEdited({ ...edited, protein: val === "" || isNaN(n) ? 0 : n });
    setFieldError(
      "protein",
      !isNaN(n) && n >= 0
        ? undefined
        : t("ingredient_invalid_values", { ns: "meals" })
    );
  };
  const handleCarbsChange = (val: string) => {
    setCarbsStr(val);
    const n = parseFloat(val.replace(",", "."));
    setEdited({ ...edited, carbs: val === "" || isNaN(n) ? 0 : n });
    setFieldError(
      "carbs",
      !isNaN(n) && n >= 0
        ? undefined
        : t("ingredient_invalid_values", { ns: "meals" })
    );
  };
  const handleFatChange = (val: string) => {
    setFatStr(val);
    const n = parseFloat(val.replace(",", "."));
    setEdited({ ...edited, fat: val === "" || isNaN(n) ? 0 : n });
    setFieldError(
      "fat",
      !isNaN(n) && n >= 0
        ? undefined
        : t("ingredient_invalid_values", { ns: "meals" })
    );
  };
  const handleKcalChange = (val: string) => {
    setKcalStr(val);
    const n = parseFloat(val.replace(",", "."));
    setEdited({ ...edited, kcal: val === "" || isNaN(n) ? 0 : n });
    setFieldError(
      "kcal",
      !isNaN(n) && n >= 0
        ? undefined
        : t("ingredient_invalid_values", { ns: "meals" })
    );
  };

  const openMenu = () => {
    menuAnchor.current?.measureInWindow((x, y) => {
      setMenuPos({ x: x - 200, y });
      setMenuVisible(true);
    });
  };

  const validateAll = (): boolean => {
    const next: FieldErrors = {};
    if (!edited.name.trim()) {
      next.name = t("ingredient_name_required", {
        ns: "meals",
        defaultValue: "Ingredient name cannot be empty",
      });
    }
    if (!(edited.amount > 0)) {
      next.amount = t("ingredient_invalid_values", {
        ns: "meals",
        defaultValue:
          "Values must be non-negative and amount must be greater than 0",
      });
    }
    if (edited.protein < 0)
      next.protein = t("ingredient_invalid_values", { ns: "meals" });
    if (edited.carbs < 0)
      next.carbs = t("ingredient_invalid_values", { ns: "meals" });
    if (edited.fat < 0)
      next.fat = t("ingredient_invalid_values", { ns: "meals" });
    if (edited.kcal < 0)
      next.kcal = t("ingredient_invalid_values", { ns: "meals" });

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  if (editMode) {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={[
            styles.box,
            {
              backgroundColor: theme.background,
              borderRadius: theme.rounded.lg,
              shadowColor: theme.shadow,
              borderWidth: 1,
              borderColor: theme.border,
              marginBottom: 18,
              padding: 20,
              gap: 8,
            },
          ]}
        >
          <TextInput
            style={[
              styles.editInput,
              {
                color: theme.text,
                fontFamily: theme.typography.fontFamily.bold,
                fontSize: 20,
                borderColor: errors.name ? theme.error.text : theme.border,
              },
            ]}
            value={edited.name}
            onChangeText={(v) => {
              setEdited({ ...edited, name: v });
              setFieldError(
                "name",
                v.trim()
                  ? undefined
                  : t("ingredient_name_required", { ns: "meals" })
              );
            }}
            placeholder={t("ingredient_name", { ns: "meals" })}
            placeholderTextColor={theme.textSecondary}
            autoFocus
          />
          {!!errors.name && (
            <Text style={[styles.errorText, { color: theme.error.text }]}>
              {errors.name}
            </Text>
          )}

          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              {t("amount", { ns: "meals" })}
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: theme.text,
                  borderColor: errors.amount ? theme.error.text : theme.border,
                },
              ]}
              keyboardType="numeric"
              value={amountStr}
              onChangeText={handleAmountChange}
              onBlur={() => handleBlur("amount", amountStr)}
            />
            {!!errors.amount && (
              <Text style={[styles.errorText, { color: theme.error.text }]}>
                {errors.amount}
              </Text>
            )}
          </View>

          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              {t("protein", { ns: "meals" })} [g]
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: theme.macro.protein,
                  marginBottom: 6,
                  backgroundColor: theme.macro.protein + "24",
                  borderWidth: 1,
                  borderColor: errors.protein
                    ? theme.error.text
                    : theme.macro.protein,
                },
              ]}
              keyboardType="numeric"
              value={proteinStr}
              onChangeText={handleProteinChange}
              onBlur={() => handleBlur("protein", proteinStr)}
            />
            {!!errors.protein && (
              <Text style={[styles.errorText, { color: theme.error.text }]}>
                {errors.protein}
              </Text>
            )}
          </View>

          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              {t("carbs", { ns: "meals" })} [g]
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: theme.macro.carbs,
                  marginBottom: 6,
                  backgroundColor: theme.macro.carbs + "24",
                  borderWidth: 1,
                  borderColor: errors.carbs
                    ? theme.error.text
                    : theme.macro.carbs,
                },
              ]}
              keyboardType="numeric"
              value={carbsStr}
              onChangeText={handleCarbsChange}
              onBlur={() => handleBlur("carbs", carbsStr)}
            />
            {!!errors.carbs && (
              <Text style={[styles.errorText, { color: theme.error.text }]}>
                {errors.carbs}
              </Text>
            )}
          </View>

          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              {t("fat", { ns: "meals" })} [g]
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  marginBottom: 6,
                  color: theme.macro.fat,
                  backgroundColor: theme.macro.fat + "24",
                  borderWidth: 1,
                  borderColor: errors.fat ? theme.error.text : theme.macro.fat,
                },
              ]}
              keyboardType="numeric"
              value={fatStr}
              onChangeText={handleFatChange}
              onBlur={() => handleBlur("fat", fatStr)}
            />
            {!!errors.fat && (
              <Text style={[styles.errorText, { color: theme.error.text }]}>
                {errors.fat}
              </Text>
            )}
          </View>

          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              {t("calories", { ns: "meals" })} [kcal]
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: theme.text,
                  marginBottom: 6,
                  borderColor: errors.kcal ? theme.error.text : theme.border,
                },
              ]}
              keyboardType="numeric"
              value={kcalStr}
              onChangeText={handleKcalChange}
              onBlur={() => handleBlur("kcal", kcalStr)}
            />
            {!!errors.kcal && (
              <Text style={[styles.errorText, { color: theme.error.text }]}>
                {errors.kcal}
              </Text>
            )}
          </View>

          <View>
            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: theme.accentSecondary },
              ]}
              onPress={() => {
                if (!validateAll()) return;
                setEditMode(false);
                onSave?.(edited);
              }}
            >
              <Text style={[styles.saveBtnText, { color: theme.onAccent }]}>
                {t("save_changes", { ns: "common" })}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.cancelBtn,
                { borderColor: theme.accentSecondary, marginTop: 10 },
              ]}
              onPress={() => {
                setEditMode(false);
                setEdited(initial.current);
                setAmountStr(String(initial.current.amount));
                setProteinStr(String(initial.current.protein));
                setCarbsStr(String(initial.current.carbs));
                setFatStr(String(initial.current.fat));
                setKcalStr(String(initial.current.kcal));
                setErrors({});
                onCancelEdit?.();
              }}
            >
              <Text
                style={[styles.cancelBtnText, { color: theme.accentSecondary }]}
              >
                {t("cancel", { ns: "common" })}
              </Text>
            </Pressable>
          </View>
        </View>
      </TouchableWithoutFeedback>
    );
  }

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: theme.background,
          borderRadius: theme.rounded.lg,
          borderColor: theme.border,
          borderWidth: 1,
          shadowColor: theme.shadow,
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
        },
      ]}
    >
      <View style={styles.row}>
        <Text
          style={[
            styles.name,
            {
              color: theme.text,
              fontFamily: theme.typography.fontFamily.bold,
              fontSize: theme.typography.size.lg,
            },
          ]}
        >
          {ingredient.name}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={[
              styles.amount,
              {
                color: theme.textSecondary,
                fontFamily: theme.typography.fontFamily.medium,
                fontSize: theme.typography.size.md,
              },
            ]}
          >
            {ingredient.amount}g
          </Text>
          {editable && (
            <View style={{ position: "relative" }}>
              <Pressable
                ref={menuAnchor}
                onPress={openMenu}
                style={styles.icon}
              >
                <MaterialIcons
                  name="more-vert"
                  size={24}
                  color={theme.textSecondary}
                />
              </Pressable>
            </View>
          )}
        </View>
      </View>
      <MacroChip label="Calories" value={ingredient.kcal} />
      <View style={styles.macrosRow}>
        <MacroChip label="Protein" value={ingredient.protein} />
        <MacroChip label="Carbs" value={ingredient.carbs} />
        <MacroChip label="Fat" value={ingredient.fat} />
      </View>
      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={[StyleSheet.absoluteFill]}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.dropdown,
              {
                position: "absolute",
                left: menuPos.x,
                top: menuPos.y,
                backgroundColor: theme.background,
                borderWidth: 1,
                borderColor: theme.border,
              },
            ]}
          >
            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                setMenuVisible(false);
                setEditMode(true);
              }}
            >
              <MaterialIcons
                name="edit"
                color={theme.text}
                size={18}
                style={{ marginRight: 8 }}
              />
              <Text style={[styles.dropdownLabel, { color: theme.text }]}>
                {t("edit", { ns: "common" })}
              </Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                setMenuVisible(false);
                onRemove?.();
              }}
            >
              <MaterialIcons
                name="delete"
                color={theme.error.text}
                size={18}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.dropdownLabel,
                  { color: theme.error.text, fontWeight: "bold" },
                ]}
              >
                {t("remove", { ns: "common" })}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    width: "100%",
    marginBottom: 16,
    elevation: 2,
    shadowOpacity: 0.07,
    shadowRadius: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    justifyContent: "space-between",
    gap: 8,
  },
  name: {
    fontSize: 18,
    flex: 1,
    fontWeight: "bold",
  },
  amount: {
    fontSize: 16,
    marginLeft: 8,
    marginRight: 0,
  },
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 2,
    gap: 10,
  },
  icon: {
    marginLeft: 6,
    marginRight: 0,
    padding: 2,
  },
  dropdown: {
    borderRadius: 16,
    paddingVertical: 8,
    width: 200,
    elevation: 5,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowRadius: 12,
    position: "absolute",
    right: 24,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 18,
    width: "100%",
  },
  dropdownLabel: { fontSize: 16 },
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
  errorText: { fontSize: 12, marginTop: 2 },
  saveBtn: {
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 14,
    marginTop: 18,
  },
  saveBtnText: { fontWeight: "bold", fontSize: 16 },
  cancelBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 13,
  },
  cancelBtnText: { fontWeight: "bold", fontSize: 16 },
});
