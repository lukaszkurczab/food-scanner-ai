import React, { useState, useRef } from "react";
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
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import type { Ingredient } from "@/src/types";
import { MacroChip } from "./MacroChip";

type IngredientBoxProps = {
  ingredient: Ingredient;
  editable?: boolean;
  onSave?: (ingredient: Ingredient) => void;
  onRemove?: () => void;
};

export const IngredientBox: React.FC<IngredientBoxProps> = ({
  ingredient,
  editable = true,
  onSave,
  onRemove,
}) => {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [edited, setEdited] = useState<Ingredient>(ingredient);

  const [amountStr, setAmountStr] = useState(String(ingredient.amount));
  const [proteinStr, setProteinStr] = useState(String(ingredient.protein));
  const [carbsStr, setCarbsStr] = useState(String(ingredient.carbs));
  const [fatStr, setFatStr] = useState(String(ingredient.fat));
  const [kcalStr, setKcalStr] = useState(String(ingredient.kcal));

  const initial = useRef(ingredient);
  const menuAnchor = useRef<View>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const handleAmountChange = (val: string) => {
    setAmountStr(val);
    const n = parseFloat(val.replace(",", "."));
    if (val === "" || isNaN(n) || n <= 0) {
      setEdited({ ...edited, amount: 0 });
      return;
    }
    const factor = n / (initial.current.amount || 1);
    setEdited({
      ...edited,
      amount: n,
      protein: Math.round(initial.current.protein * factor),
      carbs: Math.round(initial.current.carbs * factor),
      fat: Math.round(initial.current.fat * factor),
      kcal: Math.round(initial.current.kcal * factor),
    });
    setProteinStr(String(Math.round(initial.current.protein * factor)));
    setCarbsStr(String(Math.round(initial.current.carbs * factor)));
    setFatStr(String(Math.round(initial.current.fat * factor)));
    setKcalStr(String(Math.round(initial.current.kcal * factor)));
  };

  const handleBlur = (field: keyof Ingredient, value: string) => {
    const num = parseFloat(value.replace(",", "."));
    setEdited((prev) => ({
      ...prev,
      [field]: value === "" || isNaN(num) ? 0 : num,
    }));
    switch (field) {
      case "amount":
        setAmountStr(value === "" || isNaN(num) ? "0" : String(num));
        break;
      case "protein":
        setProteinStr(value === "" || isNaN(num) ? "0" : String(num));
        break;
      case "carbs":
        setCarbsStr(value === "" || isNaN(num) ? "0" : String(num));
        break;
      case "fat":
        setFatStr(value === "" || isNaN(num) ? "0" : String(num));
        break;
      case "kcal":
        setKcalStr(value === "" || isNaN(num) ? "0" : String(num));
        break;
    }
  };

  const handleProteinChange = (val: string) => {
    setProteinStr(val);
    const n = parseFloat(val.replace(",", "."));
    setEdited({ ...edited, protein: val === "" || isNaN(n) ? 0 : n });
  };
  const handleCarbsChange = (val: string) => {
    setCarbsStr(val);
    const n = parseFloat(val.replace(",", "."));
    setEdited({ ...edited, carbs: val === "" || isNaN(n) ? 0 : n });
  };
  const handleFatChange = (val: string) => {
    setFatStr(val);
    const n = parseFloat(val.replace(",", "."));
    setEdited({ ...edited, fat: val === "" || isNaN(n) ? 0 : n });
  };
  const handleKcalChange = (val: string) => {
    setKcalStr(val);
    const n = parseFloat(val.replace(",", "."));
    setEdited({ ...edited, kcal: val === "" || isNaN(n) ? 0 : n });
  };

  const openMenu = () => {
    menuAnchor.current?.measureInWindow((x, y, w, h) => {
      setMenuPos({ x: x - 200, y });
      setMenuVisible(true);
    });
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
                borderColor: theme.border,
              },
            ]}
            value={edited.name}
            onChangeText={(v) => setEdited({ ...edited, name: v })}
            placeholder="Ingredient name"
            placeholderTextColor={theme.textSecondary}
            autoFocus
          />

          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              Amount [g]
            </Text>
            <TextInput
              style={[
                styles.editInput,
                { color: theme.text, borderColor: theme.border },
              ]}
              keyboardType="numeric"
              value={amountStr}
              onChangeText={handleAmountChange}
              onBlur={() => handleBlur("amount", amountStr)}
            />
          </View>
          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              Protein [g]
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: theme.macro.protein,
                  marginBottom: 14,
                  backgroundColor: theme.macro.protein + 24,
                  borderWidth: 1,
                  borderColor: theme.macro.protein,
                },
              ]}
              keyboardType="numeric"
              value={proteinStr}
              onChangeText={handleProteinChange}
              onBlur={() => handleBlur("protein", proteinStr)}
            />
          </View>
          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              Carbs [g]
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: theme.macro.carbs,
                  marginBottom: 14,
                  backgroundColor: theme.macro.carbs + 24,
                  borderWidth: 1,
                  borderColor: theme.macro.carbs,
                },
              ]}
              keyboardType="numeric"
              value={carbsStr}
              onChangeText={handleCarbsChange}
              onBlur={() => handleBlur("carbs", carbsStr)}
            />
          </View>
          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              Fat [g]
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  marginBottom: 14,
                  color: theme.macro.fat,
                  backgroundColor: theme.macro.fat + 24,
                  borderWidth: 1,
                  borderColor: theme.macro.fat,
                },
              ]}
              keyboardType="numeric"
              value={fatStr}
              onChangeText={handleFatChange}
              onBlur={() => handleBlur("fat", fatStr)}
            />
          </View>
          <View>
            <Text style={[styles.editLabel, { color: theme.textSecondary }]}>
              Calories [kcal]
            </Text>
            <TextInput
              style={[
                styles.editInput,
                {
                  color: theme.text,
                  marginBottom: 14,
                  borderColor: theme.border,
                },
              ]}
              keyboardType="numeric"
              value={kcalStr}
              onChangeText={handleKcalChange}
              onBlur={() => handleBlur("kcal", kcalStr)}
            />
          </View>

          <View>
            <Pressable
              style={[
                styles.saveBtn,
                { backgroundColor: theme.accentSecondary },
              ]}
              onPress={() => {
                setEditMode(false);
                if (onSave) onSave(edited);
              }}
            >
              <Text style={[styles.saveBtnText, { color: theme.onAccent }]}>
                Save changes
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
              }}
            >
              <Text
                style={[styles.cancelBtnText, { color: theme.accentSecondary }]}
              >
                Cancel
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
                Edit
              </Text>
            </Pressable>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                setMenuVisible(false);
                if (onRemove) onRemove();
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
                Remove
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
  menuOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  macrosEditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 2,
  },
  editMacroBox: {
    borderWidth: 1.3,
    borderRadius: 12,
    padding: 5,
    alignItems: "center",
    width: "31%",
  },
  editMacroInput: {
    fontSize: 17,
    fontWeight: "bold",
    textAlign: "center",
    padding: 0,
    marginBottom: 1,
  },
  editMacroLabel: { fontSize: 12, fontWeight: "500" },
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
