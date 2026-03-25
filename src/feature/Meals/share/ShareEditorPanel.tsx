import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { useTranslation } from "react-i18next";
import ColorPickerPanel from "./ColorPickerPanel";
import AppIcon from "@/components/AppIcon";
import { Button } from "@/components/Button";
import type { ElementId } from "./DraggableItem";
import DraggableItem from "./DraggableItem";
import ChartEditorPanel from "./editors/ChartEditorPanel";
import CardEditorPanel from "./editors/CardEditorPanel";
import TextEditorPanel from "./editors/TextEditorPanel";
import type { CustomTextItem, ShareOptions } from "@/types/share";

export type ShareEditorMode =
  | "options"
  | "text"
  | "chart"
  | "card"
  | "background";

export type ShareEditorPanelOptions = ShareOptions & {
  editorPanelX?: number;
  editorPanelY?: number;
  editorPanelScale?: number;
  editorPanelRotation?: number;
};

type Props = {
  visible: boolean;
  mode: ShareEditorMode | null;
  options: ShareEditorPanelOptions;
  selectedId: ElementId | null;
  onChange: (next: ShareEditorPanelOptions) => void;
  onClose: () => void;
  onTapTextElement?: (id: ElementId) => void;

  draggable?: boolean;
  areaW?: number;
  areaH?: number;
};

export default function ShareEditorPanel({
  visible,
  mode,
  options,
  selectedId,
  onChange,
  onClose,
  onTapTextElement,
  draggable = false,
  areaW = 0,
  areaH = 0,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation(["share", "common"]);
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [isTextColorEditing, setIsTextColorEditing] = useState(false);
  const [isCardColorEditing, setIsCardColorEditing] = useState(false);

  if (!visible || !mode) return null;

  if (mode === "chart") {
    return (
      <ChartEditorPanel
        options={options}
        onChange={onChange}
        onClose={onClose}
      />
    );
  }

  const patch = (p: Partial<ShareEditorPanelOptions>) => {
    let changed = false;
    for (const key of Object.keys(p) as Array<keyof ShareEditorPanelOptions>) {
      if (p[key] !== options[key]) {
        changed = true;
        break;
      }
    }
    if (!changed) return;
    onChange({ ...options, ...p });
  };

  const customTexts: CustomTextItem[] = Array.isArray(options.customTexts)
    ? options.customTexts
    : [];

  const addCustomText = () => {
    const id = `custom:${Date.now()}`;
    const next = [
      ...customTexts,
      {
        id,
        text: "",
        x: 0.5,
        y: 0.42,
        size: 1,
        rotation: 0,
      },
    ];
    onChange({ ...options, showCustom: true, customTexts: next });
    onTapTextElement?.(id as ElementId);
  };

  const handleRemoveSelectedCustom = (id: ElementId) => {
    if (typeof id !== "string" || !id.startsWith("custom:")) return;
    if (!customTexts.some((ct) => ct.id === id)) return;

    const nextList = customTexts.filter((ct) => ct.id !== id);
    const nextOptions: ShareEditorPanelOptions =
      nextList.length > 0
        ? { ...options, customTexts: nextList }
        : {
            ...options,
            customTexts: [],
            showCustom: false,
            customText: "",
          };

    onChange(nextOptions);

    if (nextList.length > 0) {
      onTapTextElement?.(nextList[0].id as ElementId);
      return;
    }

    if (options.showTitle !== false) {
      onTapTextElement?.("title");
      return;
    }

    if (options.showKcal !== false) {
      onTapTextElement?.("kcal");
      return;
    }

    onClose();
  };

  const elementItems: {
    key:
      | "showTitle"
      | "showKcal"
      | "showChart"
      | "showMacroOverlay"
      | "showCustom";
    label: string;
  }[] = [
    { key: "showTitle", label: t("editor.show_title", "Title") },
    { key: "showKcal", label: t("editor.show_kcal", "Calories") },
    { key: "showChart", label: t("editor.show_chart", "Chart") },
    {
      key: "showMacroOverlay",
      label: t("editor.show_macros", "Macro overlay"),
    },
    { key: "showCustom", label: t("editor.show_custom", "Custom text") },
  ];

  const shouldShowDone =
    (mode !== "text" || !isTextColorEditing) &&
    (mode !== "card" || !isCardColorEditing);

  const panelBody = (
    <View style={styles.panel}>
      {mode === "options" && (
        <View style={styles.section}>
          <Text style={styles.label}>{t("editor.elements", "Elements")}</Text>

          <View style={styles.checklistContainer}>
            {elementItems.map((item) => {
              const isCustom = item.key === "showCustom";

              if (isCustom) {
                const hasCustomText =
                  customTexts.length > 0 &&
                  customTexts.some(
                    (ct) =>
                      typeof ct.text === "string" && ct.text.trim().length > 0,
                  );

                return (
                  <Pressable
                    key={item.key}
                    style={styles.dropdownRow}
                    onPress={addCustomText}
                  >
                    <AppIcon
                      name={hasCustomText ? "edit" : "add"}
                      size={20}
                      color={
                        hasCustomText
                          ? theme.primary
                          : theme.textSecondary
                      }
                    />
                    <Text style={styles.dropdownLabel}>{item.label}</Text>
                  </Pressable>
                );
              }

              const active = !!options[item.key];
              return (
                <Pressable
                  key={item.key}
                  style={styles.dropdownRow}
                  onPress={() => patch({ [item.key]: !active })}
                >
                  <AppIcon
                    name={active ? "checkbox" : "checkbox-empty"}
                    size={20}
                    color={active ? theme.primary : theme.textSecondary}
                  />
                  <Text style={styles.dropdownLabel}>{item.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {mode === "text" && (
        <TextEditorPanel
          options={options}
          selectedId={selectedId}
          onChange={onChange}
          onTapTextElement={onTapTextElement}
          onColorPickingChange={setIsTextColorEditing}
          onRemoveSelectedCustom={handleRemoveSelectedCustom}
        />
      )}

      {mode === "card" && (
        <CardEditorPanel
          options={options}
          onChange={onChange}
          onColorPickingChange={setIsCardColorEditing}
        />
      )}

      {mode === "background" && (
        <View style={styles.section}>
          <Text style={styles.label}>{t("editor.background_color")}</Text>
          <ColorPickerPanel
            value={options.bgColor || "#000000"}
            onChange={(hex) => patch({ bgColor: hex })}
          />
        </View>
      )}

      {shouldShowDone && (
        <View style={styles.actions}>
          <Button
            label={t("editor.done")}
            onPress={onClose}
            fullWidth={false}
            style={styles.button}
          />
        </View>
      )}
    </View>
  );

  if (!draggable) return panelBody;
  if (!areaW || !areaH) return panelBody;

  return (
    <DraggableItem
      id="editor-panel"
      areaX={0}
      areaY={0}
      areaW={areaW}
      areaH={areaH}
      initialXRatio={options.editorPanelX ?? 0.51}
      initialYRatio={options.editorPanelY ?? 0.27}
      initialScale={options.editorPanelScale ?? 1}
      initialRotation={options.editorPanelRotation ?? 0}
      enablePan
      enableTap={false}
      enablePinch={false}
      enableRotate={false}
      onUpdate={(x, y, sc, rot) =>
        onChange({
          ...options,
          editorPanelX: x,
          editorPanelY: y,
          editorPanelScale: sc,
          editorPanelRotation: rot,
        })
      }
      style={styles.dragWrap}
    >
      {panelBody}
    </DraggableItem>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    panel: {
      minWidth: 260,
      maxWidth: 340,
      borderWidth: 1,
      borderRadius: theme.rounded.sm,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
    },
    section: { marginBottom: theme.spacing.sm },
    label: { fontSize: theme.typography.size.bodyL, color: theme.textSecondary },
    actions: { alignItems: "center", marginTop: theme.spacing.sm },
    button: {
      minWidth: 120,
    },
    checklistContainer: { marginTop: theme.spacing.xs },
    dropdownRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.xs,
    },
    dropdownLabel: {
      marginLeft: theme.spacing.sm,
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
    },
    dragWrap: { zIndex: 60 },
  });
