import React from "react";
import { View, StyleSheet } from "react-native";
import ColorPicker, {
  Panel1,
  Swatches,
  Preview,
  OpacitySlider,
  BrightnessSlider,
} from "reanimated-color-picker";

type Props = {
  value: string;
  onChange: (hex: string) => void;
};

export default function ColorPickerPanel({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ColorPicker
        value={value}
        onChangeJS={(color: any) => onChange(color.hex)}
        boundedThumb
        adaptSpectrum
        thumbSize={20}
        style={{ width: "100%" }}
      >
        <Preview />
        <Panel1 />
        <BrightnessSlider />
        <OpacitySlider />
        <Swatches />
      </ColorPicker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
});
