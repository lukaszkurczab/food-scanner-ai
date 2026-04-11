import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import ColorPicker, { HueSlider, OpacitySlider, Panel1 } from "reanimated-color-picker";
import { useTheme } from "@/theme/useTheme";

type DockColorPickerModalProps = {
  visible: boolean;
  closeLabel: string;
  doneLabel: string;
  title: string;
  colorValue: string;
  normalizedColorValue: string;
  showOpacity: boolean;
  onClose: () => void;
  onApplyColor: (color: string) => void;
};

export default function DockColorPickerModal({
  visible,
  closeLabel,
  doneLabel,
  title,
  colorValue,
  normalizedColorValue,
  showOpacity,
  onClose,
  onApplyColor,
}: DockColorPickerModalProps) {
  const theme = useTheme();

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.colorPickerModalRoot}>
        <Pressable
          style={styles.colorPickerBackdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
        />
        <View style={[styles.colorPickerSheet, { borderColor: theme.border }]}> 
          <View style={styles.colorPickerHeader}>
            <Text
              style={[
                styles.colorPickerTitle,
                { fontFamily: theme.typography.fontFamily.semiBold },
              ]}
            >
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              style={[styles.colorPickerDone, { borderColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel={doneLabel}
            >
              <Text
                style={[
                  styles.colorPickerDoneLabel,
                  { fontFamily: theme.typography.fontFamily.medium },
                ]}
              >
                {doneLabel}
              </Text>
            </Pressable>
          </View>

          <View style={styles.colorPreviewRow}>
            <View
              style={[
                styles.colorPreviewSwatch,
                {
                  borderColor: theme.borderSoft,
                  backgroundColor: colorValue,
                },
              ]}
            />
            <Text
              style={[
                styles.colorPreviewValue,
                { fontFamily: theme.typography.fontFamily.medium },
              ]}
            >
              {normalizedColorValue}
            </Text>
          </View>

          <ColorPicker
            value={colorValue}
            onChangeJS={({ hex, rgba }) => onApplyColor(showOpacity ? (rgba || hex) : hex)}
            style={styles.colorPicker}
          >
            <Panel1 style={styles.colorPickerPanel} />
            <HueSlider style={styles.colorPickerHue} />
            {showOpacity ? <OpacitySlider style={styles.colorPickerOpacity} /> : null}
          </ColorPicker>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  },
  colorPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  colorPickerTitle: {
    color: "#393128",
    fontSize: 16,
    lineHeight: 19,
  },
  colorPickerDone: {
    minHeight: 28,
    minWidth: 68,
    borderRadius: 14,
    borderWidth: 1,
    backgroundColor: "#F7F2EA",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  colorPickerDoneLabel: {
    color: "#393128",
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
  },
  colorPreviewValue: {
    color: "#393128",
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
