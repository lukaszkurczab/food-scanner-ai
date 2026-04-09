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

function editorTitle(kind: ActiveLayerEditorKind) {
  switch (kind) {
    case "text":
      return "Editing text";
    case "chart":
      return "Editing chart";
    case "card":
      return "Editing card";
    case "additionalPhoto":
      return "Editing photo";
    case "mealPhoto":
      return "Editing meal photo";
    default:
      return "Add element";
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
            <Text style={stylesWithTheme.sectionLabel}>Presets</Text>
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
                <Text style={stylesWithTheme.metaLabel}>Active layer</Text>
                <Text style={stylesWithTheme.activeLayerTitle}>
                  {editorTitle(activeEditorKind)}
                </Text>
              </View>
              {showRemove ? (
                <Pressable onPress={onRemoveSelectedLayer} style={stylesWithTheme.localAction}>
                  <Text style={stylesWithTheme.localActionLabel}>Remove</Text>
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
                          label="Bold"
                          active={selectedTextLayer.bold}
                          onPress={() =>
                            onTextStyleChange(selectedTextLayer.id, {
                              bold: !selectedTextLayer.bold,
                            })
                          }
                        />
                        <DockChip
                          label="Italic"
                          active={selectedTextLayer.italic}
                          onPress={() =>
                            onTextStyleChange(selectedTextLayer.id, {
                              italic: !selectedTextLayer.italic,
                            })
                          }
                        />
                        <DockChip
                          label="Underline"
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
                        label="Text color"
                        active={false}
                        onPress={() => {
                          setIsTextColorPanelOpen(true);
                          setCustomColorTarget(null);
                        }}
                      />
                    ) : (
                      <>
                        <DockChip
                          label="Done"
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
                          label="Custom"
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
                          label="Type"
                          active={false}
                          onPress={() => {
                            setChartEditorMode("type");
                            setCustomColorTarget(null);
                          }}
                        />
                        <DockChip
                          label="Text"
                          active={false}
                          onPress={() => {
                            setChartEditorMode("text");
                            setCustomColorTarget(null);
                          }}
                        />
                        <DockChip
                          label="Background"
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
                        label="Done"
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
                          label="Polar"
                          active={composition.widgets.chart?.variant === "macroPolarArea"}
                          onPress={() => onChartVariantChange("macroPolarArea")}
                        />
                        <DockChip
                          label="Pie"
                          active={composition.widgets.chart?.variant === "macroPie"}
                          onPress={() => onChartVariantChange("macroPie")}
                        />
                        <DockChip
                          label="Donut"
                          active={composition.widgets.chart?.variant === "macroDonut"}
                          onPress={() => onChartVariantChange("macroDonut")}
                        />
                        <DockChip
                          label="Gauge"
                          active={composition.widgets.chart?.variant === "macroGauge"}
                          onPress={() => onChartVariantChange("macroGauge")}
                        />
                        <DockChip
                          label="Bar"
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
                          label="Custom"
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
                          label="Custom"
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
                          label="Type"
                          active={false}
                          onPress={() => {
                            setCardEditorMode("type");
                            setCustomColorTarget(null);
                          }}
                        />
                        <DockChip
                          label="Text"
                          active={false}
                          onPress={() => {
                            setCardEditorMode("text");
                            setCustomColorTarget(null);
                          }}
                        />
                        <DockChip
                          label="Background"
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
                        label="Done"
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
                          label="Split"
                          active={composition.widgets.card?.variant === "macroSplitCard"}
                          onPress={() => onCardVariantChange("macroSplitCard")}
                        />
                        <DockChip
                          label="Summary"
                          active={composition.widgets.card?.variant === "macroSummaryCard"}
                          onPress={() => onCardVariantChange("macroSummaryCard")}
                        />
                        <DockChip
                          label="Strip"
                          active={composition.widgets.card?.variant === "macroTagStripCard"}
                          onPress={() => onCardVariantChange("macroTagStripCard")}
                        />
                        <DockChip
                          label="Vertical"
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
                          label="Custom"
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
                          label="Custom"
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
                      label="Plain"
                      active={composition.additionalPhoto?.treatment === "plain"}
                      onPress={() => onAdditionalPhotoTreatmentChange("plain")}
                    />
                    <DockChip
                      label="Shadow"
                      active={composition.additionalPhoto?.treatment === "shadow"}
                      onPress={() => onAdditionalPhotoTreatmentChange("shadow")}
                    />
                    <DockChip
                      label="Frame"
                      active={composition.additionalPhoto?.treatment === "frame"}
                      onPress={() => onAdditionalPhotoTreatmentChange("frame")}
                    />
                    <DockChip
                      label="Pill"
                      active={composition.additionalPhoto?.treatment === "pill"}
                      onPress={() => onAdditionalPhotoTreatmentChange("pill")}
                    />
                  </>
                ) : null}
              </ScrollView>
            ) : null}

            {activeEditorKind === "none" ? (
              <View style={stylesWithTheme.utilityRow}>
                <Pressable onPress={onAddTextLayer} style={stylesWithTheme.utilityAction}>
                  <AppIcon name="text" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>Text</Text>
                </Pressable>
                <Pressable onPress={onEnsureChartLayer} style={stylesWithTheme.utilityAction}>
                  <AppIcon name="stats" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>Chart</Text>
                </Pressable>
                <Pressable onPress={onEnsureCardLayer} style={stylesWithTheme.utilityAction}>
                  <AppIcon name="card" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>Card</Text>
                </Pressable>
                <Pressable
                  onPress={onAddOrReplaceAdditionalPhoto}
                  style={stylesWithTheme.utilityAction}
                >
                  <AppIcon name="add-photo" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>Photo</Text>
                </Pressable>
                <Pressable onPress={onResetComposition} style={stylesWithTheme.utilityAction}>
                  <AppIcon name="refresh" size={16} color={theme.textSecondary} />
                  <Text style={stylesWithTheme.utilityActionLabel}>Reset</Text>
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
          label="Save to gallery"
          primary={false}
          loading={isSaving}
          onPress={onSaveToGallery}
        />
        <FlowActionButton
          label="Share"
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
          />
          <View style={stylesWithTheme.colorPickerSheet}>
            <View style={stylesWithTheme.colorPickerHeader}>
              <Text style={stylesWithTheme.colorPickerTitle}>
                {isBackgroundCustomTarget ? "Background color" : "Text color"}
              </Text>
              <Pressable
                onPress={() => setCustomColorTarget(null)}
                style={stylesWithTheme.colorPickerDone}
              >
                <Text style={stylesWithTheme.colorPickerDoneLabel}>Done</Text>
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
