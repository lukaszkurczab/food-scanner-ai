import React, { useRef, useState } from "react";
import { View, TextInput, StyleSheet, Pressable, Platform } from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  onClear?: () => void;
  autoFocus?: boolean;
};

export const SearchBar: React.FC<Props> = ({
  value,
  onChangeText,
  onSubmitEditing,
  placeholder = "Search...",
  onClear,
  autoFocus = false,
}) => {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handleClear = () => {
    if (onClear) onClear();
    if (inputRef.current) inputRef.current.blur();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderRadius: theme.rounded.md,
          borderColor: isFocused ? theme.accent : theme.border,
          borderWidth: isFocused ? 1.5 : 1,
          shadowColor: isFocused ? theme.shadow : "transparent",
          shadowOpacity: isFocused ? 0.1 : 0,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        },
      ]}
    >
      <MaterialIcons
        name="search"
        size={20}
        color={theme.textSecondary}
        style={styles.iconLeft}
      />
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          {
            color: theme.text,
            fontSize: theme.typography.size.base,
            fontFamily: theme.typography.fontFamily.regular,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        autoFocus={autoFocus}
        returnKeyType="search"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onSubmitEditing={onSubmitEditing}
        selectionColor={theme.accent}
        underlineColorAndroid="transparent"
      />
      {value.length > 0 && onClear && (
        <Pressable
          onPress={handleClear}
          style={({ pressed }) => [
            styles.clearButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          hitSlop={8}
        >
          <MaterialIcons name="close" size={18} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    minHeight: 40,
    width: "100%",
  },
  iconLeft: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 8 : 6,
    paddingHorizontal: 0,
  },
  clearButton: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
    width: 32,
    height: 32,
  },
});
