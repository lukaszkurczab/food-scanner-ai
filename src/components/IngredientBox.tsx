import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  StyleSheet as RNStyleSheet,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import AppIcon from "@/components/AppIcon";
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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation(["meals", "common"]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [editMode, setEditMode] = useState(initialEdit);
  const menuAnchor = useRef<View>(null);
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });

  const boxCardStyle = useMemo(
    () => ({
      backgroundColor: hasError ? theme.error.surface : theme.surface,
      borderColor: hasError ? theme.error.border : theme.borderSoft,
    }),
    [
      hasError,
      theme.error.surface,
      theme.error.border,
      theme.surface,
      theme.borderSoft,
    ],
  );

  const dropdownPositionStyle = useMemo(
    () => ({
      left: Math.max(theme.spacing.md, menuPos.x - 196),
      top: menuPos.y + 28,
    }),
    [menuPos.x, menuPos.y, theme.spacing.md],
  );

  const openMenu = () => {
    menuAnchor.current?.measureInWindow((x, y) => {
      setMenuPos({ x, y });
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
    <View style={[styles.box, boxCardStyle]}>
      <View style={styles.row}>
        <View style={styles.summaryPressable}>
          <Text style={styles.title} numberOfLines={1}>
            {ingredient.name || t("ingredient_name", { ns: "meals" })}
          </Text>
          <Text style={styles.amountText}>
            {ingredient.amount}
            {ingredient.unit ? ingredient.unit : "g"}
          </Text>
        </View>

        {editable ? (
          <Pressable ref={menuAnchor} onPress={openMenu} style={styles.icon}>
            <AppIcon name="more" size={20} color={theme.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.macrosWrap}>
        <View style={styles.macrosMeasure}>
          <MacroChip kind="kcal" value={ingredient.kcal} />
          <View style={styles.macrosRow}>
            <MacroChip kind="protein" value={ingredient.protein} />
            <MacroChip kind="carbs" value={ingredient.carbs} />
            <MacroChip kind="fat" value={ingredient.fat} />
          </View>
        </View>
      </View>

      <Modal
        visible={menuVisible}
        transparent
        animationType="none"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable
          style={[RNStyleSheet.absoluteFill, styles.menuOverlay]}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.dropdown, dropdownPositionStyle]}>
            <Pressable
              style={styles.dropdownItem}
              onPress={() => {
                setMenuVisible(false);
                setEditMode(true);
                onEditStart?.();
              }}
            >
              <AppIcon
                name="edit"
                color={theme.text}
                size={18}
                style={styles.dropdownIcon}
              />
              <Text style={styles.dropdownLabel}>
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
              <AppIcon
                name="delete"
                color={theme.error.text}
                size={18}
                style={styles.dropdownIcon}
              />
              <Text style={[styles.dropdownLabel, styles.dropdownLabelDanger]}>
                {t("remove", { ns: "common" })}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    box: {
      width: "100%",
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    summaryPressable: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    title: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      flex: 1,
    },
    amountText: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    macrosRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    macrosWrap: {
      overflow: "hidden",
    },
    macrosMeasure: {
      gap: theme.spacing.xs,
      paddingTop: theme.spacing.xxs,
    },
    icon: {
      marginLeft: theme.spacing.xs,
      width: 32,
      height: 32,
      borderRadius: theme.rounded.full,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.surfaceAlt,
    },
    menuOverlay: {
      backgroundColor: "transparent",
    },
    dropdown: {
      position: "absolute",
      borderRadius: theme.rounded.lg,
      paddingVertical: theme.spacing.xs,
      width: 200,
      alignItems: "flex-start",
      backgroundColor: theme.surfaceElevated,
      borderWidth: 1,
      borderColor: theme.border,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.2 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    dropdownItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      width: "100%",
      minHeight: 44,
    },
    dropdownIcon: {
      marginRight: theme.spacing.sm,
    },
    dropdownLabel: {
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      color: theme.text,
      fontFamily: theme.typography.fontFamily.regular,
    },
    dropdownLabelDanger: {
      color: theme.error.text,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });
