import { useState, useEffect } from "react";
import "react-native-get-random-values";
import {
  TextInput as DefaultTextInput,
  StyleSheet,
  TextInputProps as RNTextInputProps,
  TextStyle,
} from "react-native";
import { useTheme } from "@/src/theme/index";

type CustomTextInputProps = {
  value: string;
  onChange?: (text: string) => void;
  onEndEditing?: (text: string) => void;
  keyboardType?: RNTextInputProps["keyboardType"];
  placeholder?: string;
  placeholderTextColor?: string;
  style?: TextStyle;
};

export const TextInput = ({
  value,
  onChange,
  onEndEditing,
  keyboardType = "default",
  placeholder,
  placeholderTextColor,
  style,
}: CustomTextInputProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [inputText, setInputText] = useState(value);

  useEffect(() => {
    setInputText(value);
  }, [value]);

  const handleTextChange = (newText: string) => {
    setInputText(newText);
    if (onChange) onChange(newText);
  };

  const handleEndEditing = () => {
    if (onEndEditing) onEndEditing(inputText);
  };

  return (
    <DefaultTextInput
      value={inputText}
      onChangeText={handleTextChange}
      onEndEditing={handleEndEditing}
      keyboardType={keyboardType}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor ?? theme.accent}
      style={[styles.input, style]}
    />
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      fontSize: 14,
      color: theme.text,
      backgroundColor: theme.card,
    },
  });
