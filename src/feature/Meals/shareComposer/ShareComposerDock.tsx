import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";
import ColorPicker, { HueSlider, OpacitySlider, Panel1 } from "reanimated-color-picker";
import AppIcon from "@/components/AppIcon";
import { useTheme } from "@/theme/useTheme";
import { QUICK_PRESET_OPTIONS } from "@/feature/Meals/shareComposer/presets";
import type {
  ActiveLayerEditorKind,
  ShareCardVariant,
  ShareChartVariant,
  ShareCompositionState,
  ShareExportState,
  ShareLayerId,
  SharePresetId,
  ShareTextLayerState,
} from "@/feature/Meals/shareComposer/types";

type ShareComposerDockProps = {
  width?: number;
  mode: "quick" | "customize";
  selectedPreset: SharePresetId;
  activeEditorKind: ActiveLayerEditorKind;
  selectedLayerId: ShareLayerId | null;
  composition: ShareCompositionState;
  mealPhotoUri: string;
  exportState: ShareExportState;
  onPresetSelect: (presetId: SharePresetId) => void;
  onSaveToGallery: () => void;
  onShare: () => void;
  onRemoveSelectedLayer: () => void;
  onResetComposition: () => void;
  onTextStyleChange: (
    id: string,
    patch: Partial<Pick<ShareTextLayerState, "bold" | "italic" | "underline" | "color">>,
  ) => void;
  onChartVariantChange: (variant: ShareChartVariant) => void;
  onChartStyleChange: (patch: { textColor?: string; backgroundColor?: string }) => void;
  onCardVariantChange: (variant: ShareCardVariant) => void;
  onCardStyleChange: (patch: { textColor?: string; backgroundColor?: string }) => void;
  onAdditionalPhotoTreatmentChange: (
    treatment: NonNullable<ShareCompositionState["additionalPhoto"]>["treatment"],
  ) => void;
  onAddTextLayer: () => void;
  onEnsureChartLayer: () => void;
  onEnsureCardLayer: () => void;
  onAddOrReplaceAdditionalPhoto: () => void;
};

type DockChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
};

const DOCK_FIXED_HEIGHT = 176;
const DOCK_CONTENT_HEIGHT = 74;
const DOCK_ERROR_HEIGHT = 14;
const FALLBACK_TEXT_COLOR = "#393128";
const FALLBACK_BACKGROUND_COLOR = "#FBF8F2";

type WidgetEditorMode = "type" | "text" | "background";
type CustomColorTarget =
  | "text"
  | "chartText"
  | "chartBackground"
  | "cardText"
  | "cardBackground";

function normalizeHexColor(input: string) {
  if (!input) return FALLBACK_TEXT_COLOR;
  const trimmed = input.trim();

  if (/^rgba?\(/i.test(trimmed)) {
    return trimmed.replace(/\s+/g, "").toLowerCase();
  }

  if (trimmed.startsWith("#")) {
    return trimmed.toUpperCase();
  }

  return `#${trimmed.toUpperCase()}`;
}

function DockChip({ label, active, onPress, compact = false }: DockChipProps) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        compact ? styles.chipCompact : null,
        {
          backgroundColor: active ? theme.primary : "#F7F2EA",
          borderColor: active ? theme.primary : theme.borderSoft,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.chipLabel,
          {
            color: active ? "#FBF8F2" : "#393128",
            fontFamily: active
              ? theme.typography.fontFamily.semiBold
              : theme.typography.fontFamily.medium,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function presetAccessibilityLabel(presetId: SharePresetId) {
  if (presetId === "quickSidebar") return "Sidebar preset";
  if (presetId === "quickFooter") return "Footer preset";
  return "Top card preset";
}

function PresetThumb({
  presetId,
  mealPhotoUri,
  active,
  onPress,
}: {
  presetId: SharePresetId;
  mealPhotoUri: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const macroBars = [
    { color: theme.macro.protein, width: 18 },
    { color: theme.macro.carbs, width: 19 },
    { color: theme.macro.fat, width: 16 },
  ];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={presetAccessibilityLabel(presetId)}
      style={({ pressed }) => [
        styles.presetThumb,
        {
          borderColor: active ? theme.primary : theme.border,
          borderWidth: active ? 1.5 : 1,
          opacity: pressed ? 0.86 : 1,
        },
      ]}
    >
      {mealPhotoUri.trim() ? (
        <Image
          source={{ uri: mealPhotoUri }}
          resizeMode="cover"
          style={styles.presetPreviewPhoto}
        />
      ) : (
        <View style={styles.presetPreviewPhotoFallback} />
      )}

      {presetId === "quickSidebar" ? (
        <>
          <View style={[styles.presetPreviewCard, styles.presetPreviewCardSidebar]} />
          <View style={[styles.presetHeadline, styles.presetHeadlineSidebar]} />
          <View style={styles.presetSidebarLines}>
            {macroBars.map((bar) => (
              <View
                key={bar.color}
                style={[
                  styles.presetLine,
                  {
                    width: 16,
                    backgroundColor: bar.color,
                  },
                ]}
              />
            ))}
          </View>
        </>
      ) : presetId === "quickFooter" ? (
        <>
          <View style={[styles.presetPreviewCard, styles.presetPreviewCardFooter]} />
          <View style={[styles.presetHeadline, styles.presetHeadlineFooter]} />
          <View style={styles.presetFooterLines}>
            {macroBars.map((bar) => (
              <View
                key={bar.color}
                style={[
                  styles.presetLine,
                  {
                    width: bar.width,
                    backgroundColor: bar.color,
                  },
                ]}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <View style={[styles.presetPreviewCard, styles.presetPreviewCardTop]} />
          <View style={[styles.presetHeadline, styles.presetHeadlineTop]} />
          <View style={styles.presetTopLines}>
            {macroBars.map((bar) => (
              <View
                key={bar.color}
                style={[
                  styles.presetLine,
                  {
                    width: bar.width,
                    backgroundColor: bar.color,
                  },
                ]}
              />
            ))}
          </View>
        </>
      )}
    </Pressable>
  );
}

function FlowActionButton({
  label,
  primary,
  loading,
  onPress,
}: {
  label: string;
  primary: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.flowButton,
        {
          backgroundColor: primary ? theme.primary : "#FBF8F2",
          borderColor: primary ? theme.primary : theme.border,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={primary ? "#FBF8F2" : "#393128"} />
      ) : (
        <Text
          style={[
            styles.flowButtonLabel,
            {
              color: primary ? "#FBF8F2" : "#393128",
              fontFamily: theme.typography.fontFamily.semiBold,
            },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

function editorTitle(kind: ActiveLayerEditorKind, t: (key: string) => string) {
  switch (kind) {
    case "text":
      return t("dock.editing_text");
    case "chart":
      return t("dock.editing_chart");
    case "card":
      return t("dock.editing_card");
    case "additionalPhoto":
      return t("dock.editing_photo");
    case "mealPhoto":
      return t("dock.editing_meal_photo");
    default:
      return t("dock.add_element");
  }
}

function isLayerRemovable(layerId: ShareLayerId | null) {
  if (!layerId) return false;
  if (layerId === "mealPhoto") return false;
  if (layerId === "text:title") return false;
  return true;
}

export default function ShareComposerDock({
  width,
  mode,
  selectedPreset,
  activeEditorKind,
  selectedLayerId,
  composition,
  mealPhotoUri,
  exportState,
  onPresetSelect,
  onSaveToGallery,
  onShare,
  onRemoveSelectedLayer,
  onResetComposition,
  onTextStyleChange,
  onChartVariantChange,
  onChartStyleChange,
  onCardVariantChange,
  onCardStyleChange,
  onAdditionalPhotoTreatmentChange,
  onAddTextLayer,
  onEnsureChartLayer,
  onEnsureCardLayer,
  onAddOrReplaceAdditionalPhoto,
}: ShareComposerDockProps) {
  const theme = useTheme();
  const { t } = useTranslation("share");
  const stylesWithTheme = useMemo(() => makeStyles(theme), [theme]);
  const hasEditorOptions = activeEditorKind !== "none";
  const [isTextColorPanelOpen, setIsTextColorPanelOpen] = useState(false);
  const [chartEditorMode, setChartEditorMode] = useState<WidgetEditorMode | null>(null);
  const [cardEditorMode, setCardEditorMode] = useState<WidgetEditorMode | null>(null);
  const [customColorTarget, setCustomColorTarget] = useState<CustomColorTarget | null>(null);

  const selectedTextLayer =
    selectedLayerId && selectedLayerId.startsWith("text:")
      ? composition.textLayers.find((layer) => layer.id === selectedLayerId) ?? null
      : null;
  const selectedChartLayer = composition.widgets.chart;
  const selectedCardLayer = composition.widgets.card;
  const textColorOptions = useMemo(
    () => [
      { label: "Cream", value: "#FFFDF8" },
      { label: "Ink", value: "#393128" },
      { label: "Olive", value: theme.primary },
    ],
    [theme.primary],
  );

  const showRemove = isLayerRemovable(selectedLayerId);
  const isSaving = exportState.action === "save_to_gallery";
  const isSharing = exportState.action === "share";
  const selectedTextColor = selectedTextLayer?.color ?? FALLBACK_TEXT_COLOR;
  const selectedChartTextColor = selectedChartLayer?.textColor ?? FALLBACK_TEXT_COLOR;
  const selectedChartBackgroundColor =
    selectedChartLayer?.backgroundColor ?? FALLBACK_BACKGROUND_COLOR;
  const selectedCardTextColor = selectedCardLayer?.textColor ?? FALLBACK_TEXT_COLOR;
  const selectedCardBackgroundColor =
    selectedCardLayer?.backgroundColor ?? FALLBACK_BACKGROUND_COLOR;
  const normalizedSelectedTextColor = normalizeHexColor(selectedTextColor);
  const normalizedSelectedChartTextColor = normalizeHexColor(selectedChartTextColor);
  const normalizedSelectedChartBackgroundColor = normalizeHexColor(
    selectedChartBackgroundColor,
  );
  const normalizedSelectedCardTextColor = normalizeHexColor(selectedCardTextColor);
  const normalizedSelectedCardBackgroundColor = normalizeHexColor(
    selectedCardBackgroundColor,
  );
  const usesPresetTextColor = textColorOptions.some(
    (option) => normalizeHexColor(option.value) === normalizedSelectedTextColor,
  );
  const usesPresetChartTextColor = textColorOptions.some(
    (option) => normalizeHexColor(option.value) === normalizedSelectedChartTextColor,
  );
  const usesPresetChartBackgroundColor = textColorOptions.some(
    (option) => normalizeHexColor(option.value) === normalizedSelectedChartBackgroundColor,
  );
  const usesPresetCardTextColor = textColorOptions.some(
    (option) => normalizeHexColor(option.value) === normalizedSelectedCardTextColor,
  );
  const usesPresetCardBackgroundColor = textColorOptions.some(
    (option) => normalizeHexColor(option.value) === normalizedSelectedCardBackgroundColor,
  );

  useEffect(() => {
    if (activeEditorKind !== "text" || !selectedTextLayer) {
      setIsTextColorPanelOpen(false);
    }
    if (activeEditorKind !== "chart") {
      setChartEditorMode(null);
    }
    if (activeEditorKind !== "card") {
      setCardEditorMode(null);
    }
    if (
      (customColorTarget === "text" && activeEditorKind !== "text") ||
      ((customColorTarget === "chartText" || customColorTarget === "chartBackground") &&
        activeEditorKind !== "chart") ||
      ((customColorTarget === "cardText" || customColorTarget === "cardBackground") &&
        activeEditorKind !== "card") ||
      (activeEditorKind !== "text" &&
        activeEditorKind !== "chart" &&
        activeEditorKind !== "card")
    ) {
      setCustomColorTarget(null);
    }
  }, [activeEditorKind, customColorTarget, selectedTextLayer]);

  const applyTextColor = (color: string) => {
    if (!selectedTextLayer) return;
    onTextStyleChange(selectedTextLayer.id, {
      color: normalizeHexColor(color),
    });
  };

  const applyChartTextColor = (color: string) => {
    onChartStyleChange({ textColor: normalizeHexColor(color) });
  };

  const applyChartBackgroundColor = (color: string) => {
    onChartStyleChange({ backgroundColor: normalizeHexColor(color) });
  };

  const applyCardTextColor = (color: string) => {
    onCardStyleChange({ textColor: normalizeHexColor(color) });
  };

  const applyCardBackgroundColor = (color: string) => {
    onCardStyleChange({ backgroundColor: normalizeHexColor(color) });
  };

  const customColorValue =
    customColorTarget === "text"
      ? selectedTextColor
      : customColorTarget === "chartText"
        ? selectedChartTextColor
        : customColorTarget === "chartBackground"
          ? selectedChartBackgroundColor
          : customColorTarget === "cardText"
            ? selectedCardTextColor
            : customColorTarget === "cardBackground"
              ? selectedCardBackgroundColor
              : FALLBACK_TEXT_COLOR;

  const normalizedCustomColorValue = normalizeHexColor(customColorValue);
  const isBackgroundCustomTarget =
    customColorTarget === "chartBackground" ||
    customColorTarget === "cardBackground";

  const applyCustomColor = (color: string) => {
    if (!customColorTarget) return;
    if (customColorTarget === "text") {
      applyTextColor(color);
      return;
    }
    if (customColorTarget === "chartText") {
      applyChartTextColor(color);
      return;
    }
    if (customColorTarget === "chartBackground") {
      applyChartBackgroundColor(color);
      return;
    }
    if (customColorTarget === "cardText") {
      applyCardTextColor(color);
      return;
    }
    applyCardBackgroundColor(color);
  };

  return (
    <View style={[stylesWithTheme.dock, typeof width === "number" ? { width } : null]}>
      <View style={stylesWithTheme.grabber} />
      <View style={stylesWithTheme.contentSlot}>
        {mode === "quick" ? (
          <View style={stylesWithTheme.quickPanel}>
            <Text style={stylesWithTheme.sectionLabel}>{t("dock.presets")}</Text>
            <View style={stylesWithTheme.presetRow}>
              {QUICK_PRESET_OPTIONS.map((preset) => (
                <PresetThumb
                  key={preset.id}
                  presetId={preset.id}
                  mealPhotoUri={mealPhotoUri}
                  active={selectedPreset === preset.id}
                  onPress={() => onPresetSelect(preset.id)}
                />
              ))}
            </View>
          </View>
        ) : (
          <View
            style={[
              stylesWithTheme.customizePanel,
              !hasEditorOptions ? stylesWithTheme.customizePanelCompact : null,
            ]}
          >
            <View style={stylesWithTheme.activeLayerHeader}>
              <View>
                <Text style={stylesWithTheme.metaLabel}>{t("dock.active_layer")}</Text>
                <Text style={stylesWithTheme.activeLayerTitle}>
                  {editorTitle(activeEditorKind, t)}
                </Text>
              </View>
              {showRemove ? (
                <Pressable
                  onPress={onRemoveSelectedLayer}
                  style={stylesWithTheme.localAction}
                  accessibilityRole="button"
                  accessibilityLabel={t("dock.remove")}
                >
                  <Text style={stylesWithTheme.localActionLabel}>{t("dock.remove")}</Text>
                </Pressable>
              ) : null}
            </View>

            {hasEditorOptions ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={stylesWithTheme.optionScroller}
                contentContainerStyle={stylesWithTheme.optionRow}
              >
                {activeEditorKind === "text" && selectedTextLayer ? (
                  <>
                    {!isTextColorPanelOpen ? (
                      <>
                        <DockChip
                          label={t("dock.bold")}
                          active={selectedTextLayer.bold}
                          onPress={() =>
                            onTextStyleChange(selectedTextLayer.id, {
                              bold: !selectedTextLayer.bold,
                            })
                          }
                        />
                        <DockChip
                          label={t("dock.italic")}
                          active={selectedTextLayer.italic}
                          onPress={() =>
                            onTextStyleChange(selectedTextLayer.id, {
                              italic: !selectedTextLayer.italic,
                            })
                          }
                        />
                        <DockChip
                          label={t("dock.underline")}
                          active={selectedTextLayer.underline}
                          onPress={() =>
                            onTextStyleChange(selectedTextLayer.id, {
                              underline: !selectedTextLayer.underline,
                            })
                          }
                        />
                      </>
                    ) : null}
                    {!isTextColorPanelOpen ? (
                      <DockChip
                        label={t("dock.text_color")}
                        active={false}
                        onPress={() => {
                          setIsTextColorPanelOpen(true);
                          setCustomColorTarget(null);
                        }}
                      />
                    ) : (
                      <>
                        <DockChip
                          label={t("dock.done")}
                          active={false}
                          onPress={() => {
                            setIsTextColorPanelOpen(false);
                            setCustomColorTarget(null);
                          }}
                        />
                        {textColorOptions.map((option) => (
                          <DockChip
                            key={option.label}
                            label={option.label}
                            active={
                              normalizeHexColor(option.value) ===
                              normalizedSelectedTextColor
                            }
                            onPress={() => applyTextColor(option.value)}
                          />
                        ))}
                        <DockChip
                          label={t("dock.custom")}
                          active={!usesPresetTextColor}
                          onPress={() => setCustomColorTarget("text")}
                        />
                      </>
                    )}
                  </>
                ) : null}

                {activeEditorKind === "chart" ? (
                  <>
                    {!chartEditorMode ? (
                      <>
                        <DockChip
                          label={t("dock.type")}
                          active={false}
                          onPress={() => {
                            setChartEditorMode("type");
                            setCustomColorTarget(null);
                          }}
                        />
                        <DockChip
                          label={t("dock.text")}
                          active={false}
                          onPress={() => {
                            setChartEditorMode("text");
                            setCustomColorTarget(null);
                          }}
                        />
                        <DockChip
                          label={t("dock.background")}
                          active={false}
                          onPress={() => {
                            setChartEditorMode("background");
                            setCustomColorTarget(null);
                          }}
                        />
                      </>
                    ) : null}

                    {chartEditorMode ? (
                      <DockChip
                        label={t("dock.done")}
                        active={false}
                        onPress={() => {
                          setChartEditorMode(null);
                          setCustomColorTarget(null);
                        }}
                      />
                    ) : null}

                    {chartEditorMode === "type" ? (
                      <>
                        <DockChip
                          label={t("dock.chart_polar")}
                          active={composition.widgets.chart?.variant === "macroPolarArea"}
                          onPress={() => onChartVariantChange("macroPolarArea")}
                        />
                        <DockChip
                          label={t("dock.chart_pie")}
                          active={composition.widgets.chart?.variant === "macroPie"}
                          onPress={() => onChartVariantChange("macroPie")}
                        />
                        <DockChip
                          label={t("dock.chart_donut")}
                          active={composition.widgets.chart?.variant === "macroDonut"}
                          onPress={() => onChartVariantChange("macroDonut")}
                        />
                        <DockChip
                          label={t("dock.chart_gauge")}
                          active={composition.widgets.chart?.variant === "macroGauge"}
                          onPress={() => onChartVariantChange("macroGauge")}
                        />
                        <DockChip
                          label={t("dock.chart_bar")}
                          active={composition.widgets.chart?.variant === "macroBarMini"}
                          onPress={() => onChartVariantChange("macroBarMini")}
                        />
                      </>
                    ) : null}

                    {chartEditorMode === "text" ? (
                      <>
                        {textColorOptions.map((option) => (
                          <DockChip
                            key={`chart-text-${option.label}`}
                            label={option.label}
                            active={
                              normalizeHexColor(option.value) ===
                              normalizedSelectedChartTextColor
                            }
                            onPress={() => applyChartTextColor(option.value)}
                          />
                        ))}
                        <DockChip
                          label={t("dock.custom")}
                          active={!usesPresetChartTextColor}
                          onPress={() => setCustomColorTarget("chartText")}
                        />
                      </>
                    ) : null}

                    {chartEditorMode === "background" ? (
                      <>
                        {textColorOptions.map((option) => (
                          <DockChip
                            key={`chart-bg-${option.label}`}
                            label={option.label}
                            active={
                              normalizeHexColor(option.value) ===
                              normalizedSelectedChartBackgroundColor
                            }
                            onPress={() => applyChartBackgroundColor(option.value)}
                          />
                        ))}
                        <DockChip
                          label={t("dock.custom")}
                          active={!usesPresetChartBackgroundColor}
                          onPress={() => setCustomColorTarget("chartBackground")}
                        />
                      </>
                    ) : null}
                  </>
                ) : null}

                {activeEditorKind === "card" ? (
                  <>
                    {!cardEditorMode ? (
                      <>
                        <DockChip
                          label={t("dock.type")}
                          active={false}
                          onPress={() => {
                            setCardEditorMode("type");
                            setCustomColorTarget(null);
                          }}
                        />
                        <DockChip
                          label={t("dock.text")}
                          active={false}
                          onPress={() => {
                            setCardEditorMode("text");
                            setCustomColorTarget(null);
                          }}
                        />
                        <DockChip
                          label={t("dock.background")}
                          active={false}
                          onPress={() => {
                            setCardEditorMode("background");
                            setCustomColorTarget(null);
                          }}
                        />
                      </>
                    ) : null}

                    {cardEditorMode ? (
                      <DockChip
                        label={t("dock.done")}
                        active={false}
                        onPress={() => {
                          setCardEditorMode(null);
                          setCustomColorTarget(null);
                        }}
                      />
                    ) : null}

                    {cardEditorMode === "type" ? (
                      <>
                        <DockChip
                          label={t("dock.card_split")}
                          active={composition.widgets.card?.variant === "macroSplitCard"}
                          onPress={() => onCardVariantChange("macroSplitCard")}
                        />
                        <DockChip
                          label={t("dock.card_summary")}
                          active={composition.widgets.card?.variant === "macroSummaryCard"}
                          onPress={() => onCardVariantChange("macroSummaryCard")}
                        />
                        <DockChip
                          label={t("dock.card_strip")}
                          active={composition.widgets.card?.variant === "macroTagStripCard"}
                          onPress={() => onCardVariantChange("macroTagStripCard")}
                        />
                        <DockChip
                          label={t("dock.card_vertical")}
                          active={composition.widgets.card?.variant === "macroVerticalStackCard"}
                          onPress={() => onCardVariantChange("macroVerticalStackCard")}
                        />
                      </>
                    ) : null}

                    {cardEditorMode === "text" ? (
                      <>
                        {textColorOptions.map((option) => (
                          <DockChip
                            key={`card-text-${option.label}`}
                            label={option.label}
                            active={
                              normalizeHexColor(option.value) ===
                              normalizedSelectedCardTextColor
                            }
                            onPress={() => applyCardTextColor(option.value)}
                          />
                        ))}
                        <DockChip
                          label={t("dock.custom")}
                          active={!usesPresetCardTextColor}
                          onPress={() => setCustomColorTarget("cardText")}
                        />
                      </>
                    ) : null}

                    {cardEditorMode === "background" ? (
                      <>
                        {textColorOptions.map((option) => (
                          <DockChip
                            key={`card-bg-${option.label}`}
                            label={option.label}
                            active={
                              normalizeHexColor(option.value) ===
                              normalizedSelectedCardBackgroundColor
                            }
                            onPress={() => applyCardBackgroundColor(option.value)}
                          />
                        ))}
                        <DockChip
                          label={t("dock.custom")}
                          active={!usesPresetCardBackgroundColor}
                          onPress={() => setCustomColorTarget("cardBackground")}
                        />
                      </>
                    ) : null}
                  </>
                ) : null}

                {activeEditorKind === "additionalPhoto" ? (
                  <>
                    <DockChip
                      label={t("dock.photo_plain")}
                      active={composition.additionalPhoto?.treatment === "plain"}
                      onPress={() => onAdditionalPhotoTreatmentChange("plain")}
                    />
                    <DockChip
                      label={t("dock.photo_shadow")}
                      active={composition.additionalPhoto?.treatment === "shadow"}
                      onPress={() => onAdditionalPhotoTreatmentChange("shadow")}
                    />
                    <DockChip
                      label={t("dock.photo_frame")}
                      active={composition.additionalPhoto?.treatment === "frame"}
                      onPress={() => onAdditionalPhotoTreatmentChange("frame")}
                    />
                    <DockChip
                      label={t("dock.photo_pill")}
                      active={composition.additionalPhoto?.treatment === "pill"}
                      onPress={() => onAdditionalPhotoTreatmentChange("pill")}
                    />
                  </>
                ) : null}
              </ScrollView>
            ) : null}

            {activeEditorKind === "none" ? (
              <View style={stylesWithTheme.utilityRow}>
                <Pressable
                  onPress={onAddTextLayer}
                  style={stylesWithTheme.utilityAction}
                  accessibilityRole="button"
                  accessibilityLabel={t("dock.utility_text")}
                >
                  <AppIcon name="text" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>{t("dock.utility_text")}</Text>
                </Pressable>
                <Pressable
                  onPress={onEnsureChartLayer}
                  style={stylesWithTheme.utilityAction}
                  accessibilityRole="button"
                  accessibilityLabel={t("dock.utility_chart")}
                >
                  <AppIcon name="stats" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>{t("dock.utility_chart")}</Text>
                </Pressable>
                <Pressable
                  onPress={onEnsureCardLayer}
                  style={stylesWithTheme.utilityAction}
                  accessibilityRole="button"
                  accessibilityLabel={t("dock.utility_card")}
                >
                  <AppIcon name="card" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>{t("dock.utility_card")}</Text>
                </Pressable>
                <Pressable
                  onPress={onAddOrReplaceAdditionalPhoto}
                  style={stylesWithTheme.utilityAction}
                  accessibilityRole="button"
                  accessibilityLabel={t("dock.utility_photo")}
                >
                  <AppIcon name="add-photo" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>{t("dock.utility_photo")}</Text>
                </Pressable>
                <Pressable
                  onPress={onResetComposition}
                  style={stylesWithTheme.utilityAction}
                  accessibilityRole="button"
                  accessibilityLabel={t("dock.utility_reset")}
                >
                  <AppIcon name="refresh" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>{t("dock.utility_reset")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={stylesWithTheme.errorSlot}>
        {exportState.error ? (
          <Text numberOfLines={1} style={stylesWithTheme.errorText}>
            {exportState.error}
          </Text>
        ) : null}
      </View>

      <View style={stylesWithTheme.flowFooter}>
        <FlowActionButton
          label={t("dock.save_to_gallery")}
          primary={false}
          loading={isSaving}
          onPress={onSaveToGallery}
        />
        <FlowActionButton
          label={t("share")}
          primary
          loading={isSharing}
          onPress={onShare}
        />
      </View>

      <Modal
        transparent
        animationType="slide"
        visible={customColorTarget !== null}
        onRequestClose={() => setCustomColorTarget(null)}
      >
        <View style={stylesWithTheme.colorPickerModalRoot}>
          <Pressable
            style={stylesWithTheme.colorPickerBackdrop}
            onPress={() => setCustomColorTarget(null)}
            accessibilityRole="button"
            accessibilityLabel={t("dock.close_color_picker", {
              defaultValue: "Close color picker",
            })}
          />
          <View style={stylesWithTheme.colorPickerSheet}>
            <View style={stylesWithTheme.colorPickerHeader}>
              <Text style={stylesWithTheme.colorPickerTitle}>
                {isBackgroundCustomTarget ? t("dock.background_color") : t("dock.text_color")}
              </Text>
              <Pressable
                onPress={() => setCustomColorTarget(null)}
                style={stylesWithTheme.colorPickerDone}
                accessibilityRole="button"
                accessibilityLabel={t("dock.done")}
              >
                <Text style={stylesWithTheme.colorPickerDoneLabel}>{t("dock.done")}</Text>
              </Pressable>
            </View>

            <View style={stylesWithTheme.colorPreviewRow}>
              <View
                style={[
                  stylesWithTheme.colorPreviewSwatch,
                  { backgroundColor: customColorValue },
                ]}
              />
              <Text style={stylesWithTheme.colorPreviewValue}>
                {normalizedCustomColorValue}
              </Text>
            </View>

            <ColorPicker
              value={customColorValue}
              onChangeJS={({ hex, rgba }) =>
                applyCustomColor(isBackgroundCustomTarget ? (rgba || hex) : hex)
              }
              style={stylesWithTheme.colorPicker}
            >
              <Panel1 style={stylesWithTheme.colorPickerPanel} />
              <HueSlider style={stylesWithTheme.colorPickerHue} />
              {isBackgroundCustomTarget ? (
                <OpacitySlider style={stylesWithTheme.colorPickerOpacity} />
              ) : null}
            </ColorPicker>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 32,
    borderRadius: 16,
    paddingHorizontal: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  chipCompact: {
    minHeight: 24,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  chipLabel: {
    fontSize: 11,
    lineHeight: 13,
  },
  presetThumb: {
    width: 91,
    height: 46,
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    backgroundColor: "#F8F3EB",
  },
  presetPreviewPhoto: {
    ...StyleSheet.absoluteFillObject,
  },
  presetPreviewPhotoFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#DDD4C7",
  },
  presetPreviewCard: {
    position: "absolute",
    backgroundColor: "rgba(251,248,242,0.92)",
  },
  presetPreviewCardTop: {
    left: 11,
    right: 11,
    top: 1,
    height: 14,
    borderRadius: 6,
  },
  presetPreviewCardSidebar: {
    top: 1,
    bottom: 1,
    left: 1,
    width: 26,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  presetPreviewCardFooter: {
    left: 1,
    right: 1,
    bottom: 1,
    height: 13,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  presetHeadline: {
    position: "absolute",
    backgroundColor: "#393128",
    borderRadius: 2,
    height: 4,
  },
  presetHeadlineTop: {
    width: 22,
    top: 5,
    left: 35,
  },
  presetHeadlineSidebar: {
    width: 16,
    top: 5,
    left: 6,
  },
  presetHeadlineFooter: {
    width: 22,
    top: 36,
    left: 4,
  },
  presetLine: {
    height: 3,
    borderRadius: 2,
  },
  presetTopLines: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    left: 18,
    top: 12,
  },
  presetSidebarLines: {
    position: "absolute",
    left: 6,
    top: 12,
    gap: 2,
  },
  presetFooterLines: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
    right: 6,
    top: 37,
  },
  flowButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  flowButtonLabel: {
    fontSize: 12,
    lineHeight: 14,
  },
});

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    dock: {
      backgroundColor: "#FBF8F2",
      borderRadius: 28,
      height: DOCK_FIXED_HEIGHT,
      overflow: "hidden",
      paddingTop: 10,
      paddingHorizontal: 12,
      paddingBottom: 10,
      shadowColor: "#393128",
      shadowOpacity: 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
      gap: 8,
    },
    contentSlot: {
      minHeight: DOCK_CONTENT_HEIGHT,
      maxHeight: DOCK_CONTENT_HEIGHT,
      justifyContent: "center",
    },
    grabber: {
      alignSelf: "center",
      width: 37,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.border,
    },
    quickPanel: {
      gap: 8,
    },
    sectionLabel: {
      color: "#393128",
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: 13,
      lineHeight: 15,
      paddingHorizontal: 8,
    },
    presetRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 10,
      paddingHorizontal: 4,
    },
    quickAdjustRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 4,
      alignItems: "center",
    },
    customizePanel: {
      gap: 8,
    },
    customizePanelCompact: {
      gap: 0,
    },
    activeLayerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 8,
    },
    metaLabel: {
      color: "#7A6D5E",
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: 10,
      lineHeight: 12,
    },
    activeLayerTitle: {
      color: "#393128",
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: 15,
      lineHeight: 18,
      marginTop: 2,
    },
    localAction: {
      height: 24,
      minWidth: 68,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: "#F7F2EA",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 10,
    },
    localActionLabel: {
      color: "#C69272",
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: 11,
      lineHeight: 13,
    },
    optionRow: {
      gap: 6,
      paddingHorizontal: 8,
      paddingBottom: 2,
      alignItems: "center",
    },
    optionScroller: {
      maxHeight: 40,
    },
    utilityRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 6,
      paddingHorizontal: 4,
    },
    utilityAction: {
      minHeight: 30,
      minWidth: 58,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: "#F7F2EA",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 8,
      flexDirection: "row",
      gap: 4,
    },
    utilityActionLabel: {
      color: "#393128",
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: 10,
      lineHeight: 12,
    },
    errorText: {
      color: theme.error.main,
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: 11,
      lineHeight: 14,
      paddingHorizontal: 8,
    },
    errorSlot: {
      minHeight: DOCK_ERROR_HEIGHT,
      justifyContent: "center",
    },
    flowFooter: {
      flexDirection: "row",
      gap: 9,
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
      paddingTop: 2,
    },
    colorPickerModalRoot: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "flex-end",
    },
    colorPickerBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(57,49,40,0.34)",
    },
    colorPickerSheet: {
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      backgroundColor: "#FBF8F2",
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 20,
      gap: 10,
      borderTopWidth: 1,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.border,
    },
    colorPickerHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    colorPickerTitle: {
      color: "#393128",
      fontFamily: theme.typography.fontFamily.semiBold,
      fontSize: 16,
      lineHeight: 19,
    },
    colorPickerDone: {
      minHeight: 28,
      minWidth: 68,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: "#F7F2EA",
      paddingHorizontal: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    colorPickerDoneLabel: {
      color: "#393128",
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: 12,
      lineHeight: 14,
    },
    colorPreviewRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    colorPreviewSwatch: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1,
      borderColor: theme.borderSoft,
    },
    colorPreviewValue: {
      color: "#393128",
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: 12,
      lineHeight: 14,
      letterSpacing: 0.2,
    },
    colorPicker: {
      gap: 10,
    },
    colorPickerPanel: {
      borderRadius: 14,
      height: 150,
    },
    colorPickerHue: {
      borderRadius: 8,
      height: 22,
    },
    colorPickerOpacity: {
      borderRadius: 8,
      height: 22,
    },
  });
