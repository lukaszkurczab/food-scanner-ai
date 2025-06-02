import { useState } from "react";
import "react-native-get-random-values";
import { TextInput as DefaultTextInput, StyleSheet } from "react-native";
import { useTheme } from "../theme/useTheme";

type TextInputProps = {
  value: string;
  onChange?: (text: string) => void;
  onEndEditing?: (text: string) => void;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  styles?: any;
};

export const TextInput = ({
  value,
  onChange,
  onEndEditing,
  keyboardType = "default",
  styles,
}: TextInputProps) => {
  const theme = useTheme();
  const textInputStyles = getStyles(theme);
  const [inputText, setInputText] = useState(value);

  const handleTextChange = (newText: string) => {
    if (onChange) {
      onChange(newText);
    }
    setInputText(newText);
  };

  const handleEndEditing = () => {
    if (onEndEditing) {
      onEndEditing(inputText);
    }
  };

  return (
    <DefaultTextInput
      keyboardType={keyboardType}
      style={{ ...textInputStyles.input, ...styles }}
      value={inputText}
      onChangeText={(text) => handleTextChange(text)}
      onEndEditing={() => handleEndEditing()}
    />
  );
};

const getStyles = (theme: any) =>
  StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 6,
      paddingHorizontal: 8,
      flexGrow: 1,
    },
  });
