import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  StyleSheet as RNStyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import type { Ingredient } from "@/types";
import { MacroChip } from "./MacroChip";
import { useTranslation } from "react-i18next";
import { IngredientEditor } from "./IngredientEditor";

type Props = {
  ingredient: Ingredient;
  editable?: boolean;
  initialEdit?: boolean;
  onEditStart?: () => void;
  onSave?: (ingredient: Ingredient) => void;
  onRemove?: () => void;
  onCancelEdit?: () => void;
  onChangePartial?: (patch: Partial<Ingredient>) => void;
  errors?: Partial<Record<keyof Ingredient, string>>;
  hasError?: boolean;
};

export const IngredientBox: React.FC<Props> = ({
  ingredient,
  editable = true,
  initialEdit = false,
  onEditStart,
  onSave,
  onRemove,
  onCancelEdit,
  onChangePartial,
  errors,
  hasError,
}) => {
  const theme = useTheme();
  const { t } = useTranslation(["meals", "common"]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editMode, setEditMode] = useState(initialEdit);
  const menuAnchor = useRef<View>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const openMenu = () => {
    menuAnchor.current?.measureInWindow((x, y) => {
      setMenuPos({ x: x - 200, y });
      setMenuVisible(true);
    });
  };

  if (editMode) {
    return (
      <IngredientEditor
        initial={ingredient}
        onCommit={(i) => {
          setEditMode(false);
          onSave?.(i);
        }}
        onCancel={() => {
          setEditMode(false);
          onCancelEdit?.();
        }}
        onDelete={() => {
          setEditMode(false);
          onRemove?.();
        }}
        onChangePartial={onChangePartial}
        errors={errors}
      />
    );
  }

  return (
    <View
      style={[
        styles.box,
        {
          backgroundColor: hasError ? theme.error.background : theme.background,
          borderRadius: theme.rounded.lg,
          borderColor: hasError ? theme.error.border : theme.border,
          borderWidth: 1,
          shadowColor: theme.shadow,
          gap: theme.spacing.sm,
          padding: theme.spacing.lg,
        },
      ]}
    >
      <View style={styles.row}>
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.typography.fontFamily.bold,
            fontSize: theme.typography.size.lg,
            flex: 1,
          }}
        >
          {ingredient.name || t("ingredient_name", { ns: "meals" })}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={{
              color: theme.textSecondary,
              fontFamily: theme.typography.fontFamily.medium,
              fontSize: theme.typography.size.md,
            }}
          >
            {ingredient.amount}
            {ingredient.unit ? ingredient.unit : "g"}
          </Text>
          {editable && (
            <Pressable ref={menuAnchor} onPress={openMenu} style={styles.icon}>
              <MaterialIcons
                name="more-vert"
                size={24}
                color={theme.textSecondary}
              />
            </Pressable>
          )}
        </View>
      </View>

      <MacroChip kind="kcal" value={ingredient.kcal} />
      <View style={styles.macrosRow}>
        <MacroChip kind="protein" value={ingredient.protein} />
        <MacroChip kind="carbs" value={ingredient.carbs} />
        <MacroChip kind="fat" value={ingredient.fat} />
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={[RNStyleSheet.absoluteFill]}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.dropdown,
              {
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
                onEditStart?.();
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
  macrosRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    marginBottom: 2,
    gap: 10,
  },
  icon: { marginLeft: 6, padding: 2 },
  dropdown: {
    position: "absolute",
    borderRadius: 16,
    paddingVertical: 8,
    width: 200,
    elevation: 5,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowRadius: 12,
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
});
