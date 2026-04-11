import { ScrollView, StyleSheet } from "react-native";
import DockChip from "@/feature/Meals/shareComposer/components/DockChip";
import type {
  ActiveLayerEditorKind,
  ShareCardVariant,
  ShareChartVariant,
  ShareCompositionState,
  ShareTextLayerState,
} from "@/feature/Meals/shareComposer/types";
import type {
  CustomColorTarget,
  WidgetEditorMode,
} from "@/feature/Meals/shareComposer/components/dockEditorTypes";

type DockEditorOptionsProps = {
  activeEditorKind: ActiveLayerEditorKind;
  selectedTextLayer: ShareTextLayerState | null;
  composition: ShareCompositionState;
  textColorOptions: Array<{ label: string; value: string }>;
  normalizedSelectedTextColor: string;
  normalizedSelectedChartTextColor: string;
  normalizedSelectedChartBackgroundColor: string;
  normalizedSelectedCardTextColor: string;
  normalizedSelectedCardBackgroundColor: string;
  usesPresetTextColor: boolean;
  usesPresetChartTextColor: boolean;
  usesPresetChartBackgroundColor: boolean;
  usesPresetCardTextColor: boolean;
  usesPresetCardBackgroundColor: boolean;
  isTextColorPanelOpen: boolean;
  chartEditorMode: WidgetEditorMode | null;
  cardEditorMode: WidgetEditorMode | null;
  setIsTextColorPanelOpen: (open: boolean) => void;
  setChartEditorMode: (mode: WidgetEditorMode | null) => void;
  setCardEditorMode: (mode: WidgetEditorMode | null) => void;
  setCustomColorTarget: (target: CustomColorTarget | null) => void;
  applyTextColor: (color: string) => void;
  applyChartTextColor: (color: string) => void;
  applyChartBackgroundColor: (color: string) => void;
  applyCardTextColor: (color: string) => void;
  applyCardBackgroundColor: (color: string) => void;
  normalizeHexColor: (input: string) => string;
  onTextStyleChange: (
    id: string,
    patch: Partial<Pick<ShareTextLayerState, "bold" | "italic" | "underline" | "color">>,
  ) => void;
  onChartVariantChange: (variant: ShareChartVariant) => void;
  onCardVariantChange: (variant: ShareCardVariant) => void;
  onAdditionalPhotoTreatmentChange: (
    treatment: NonNullable<ShareCompositionState["additionalPhoto"]>["treatment"],
  ) => void;
  t: (key: string) => string;
};

export default function DockEditorOptions({
  activeEditorKind,
  selectedTextLayer,
  composition,
  textColorOptions,
  normalizedSelectedTextColor,
  normalizedSelectedChartTextColor,
  normalizedSelectedChartBackgroundColor,
  normalizedSelectedCardTextColor,
  normalizedSelectedCardBackgroundColor,
  usesPresetTextColor,
  usesPresetChartTextColor,
  usesPresetChartBackgroundColor,
  usesPresetCardTextColor,
  usesPresetCardBackgroundColor,
  isTextColorPanelOpen,
  chartEditorMode,
  cardEditorMode,
  setIsTextColorPanelOpen,
  setChartEditorMode,
  setCardEditorMode,
  setCustomColorTarget,
  applyTextColor,
  applyChartTextColor,
  applyChartBackgroundColor,
  applyCardTextColor,
  applyCardBackgroundColor,
  normalizeHexColor,
  onTextStyleChange,
  onChartVariantChange,
  onCardVariantChange,
  onAdditionalPhotoTreatmentChange,
  t,
}: DockEditorOptionsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.optionScroller}
      contentContainerStyle={styles.optionRow}
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
                  active={normalizeHexColor(option.value) === normalizedSelectedTextColor}
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
                  active={normalizeHexColor(option.value) === normalizedSelectedChartTextColor}
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
                    normalizeHexColor(option.value) === normalizedSelectedChartBackgroundColor
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
                  active={normalizeHexColor(option.value) === normalizedSelectedCardTextColor}
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
                    normalizeHexColor(option.value) === normalizedSelectedCardBackgroundColor
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
  );
}

const styles = StyleSheet.create({
  optionRow: {
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 2,
    alignItems: "center",
  },
  optionScroller: {
    maxHeight: 40,
  },
});
