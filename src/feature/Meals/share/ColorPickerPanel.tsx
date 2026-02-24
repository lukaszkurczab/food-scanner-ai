import { View, StyleSheet } from "react-native";
import ColorPicker, {
  Panel1,
  Preview,
  OpacitySlider,
} from "reanimated-color-picker";

type Props = {
  value: string;
  onChange: (hex: string) => void;
};

type PickerColor = {
  hex?: string;
};

export default function ColorPickerPanel({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ColorPicker
        value={value}
        onChangeJS={(color: PickerColor) => {
          if (typeof color.hex === "string") onChange(color.hex);
        }}
        boundedThumb
        adaptSpectrum
        thumbSize={20}
        style={styles.picker}
      >
        <Preview hideText={true} />
        <Panel1 />
        <OpacitySlider />
      </ColorPicker>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "100%" },
  picker: { width: "100%" },
});
