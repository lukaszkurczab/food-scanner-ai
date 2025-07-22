import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  LayoutRectangle,
  Dimensions,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type Option<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  label?: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  error?: string;
  disabled?: boolean;
  style?: any;
};

export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  disabled,
  style,
}: Props<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [fieldLayout, setFieldLayout] = useState<LayoutRectangle | null>(null);

  const selected = options.find((o) => o.value === value);

  const handleOutsidePress = () => setOpen(false);

  const maxHeight = Math.min(
    220,
    Dimensions.get("window").height - (fieldLayout?.y ?? 0) - 32
  );

  return (
    <View style={[style, { zIndex: 50 }]}>
      {label && (
        <Text
          style={{
            color: theme.text,
            fontSize: theme.typography.size.base,
            marginBottom: theme.spacing.xs,
            fontFamily: theme.typography.fontFamily.medium,
          }}
        >
          {label}
        </Text>
      )}
      <Pressable
        style={{
          flexDirection: "row",
          alignItems: "center",
          padding: theme.spacing.md,
          borderRadius: theme.rounded.md,
          borderWidth: 1,
          borderColor: error ? theme.error.border : theme.border,
          backgroundColor: disabled ? theme.disabled.background : theme.card,
          opacity: disabled ? 0.6 : 1,
        }}
        onPress={() => !disabled && setOpen((v) => !v)}
        onLayout={(e) => setFieldLayout(e.nativeEvent.layout)}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Text
          style={{
            color: theme.text,
            fontSize: theme.typography.size.base,
            flex: 1,
            fontFamily: theme.typography.fontFamily.regular,
          }}
          numberOfLines={1}
        >
          {selected ? selected.label : ""}
        </Text>
        <MaterialIcons
          name={open ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={24}
          color={theme.textSecondary}
          style={{ marginLeft: 4 }}
        />
      </Pressable>
      {error && (
        <Text
          style={{
            color: theme.error.text,
            marginTop: theme.spacing.xs,
            fontSize: theme.typography.size.sm,
          }}
        >
          {error}
        </Text>
      )}
      {open && fieldLayout && (
        <View
          style={[
            styles.dropdown,
            {
              position: "absolute",
              top: fieldLayout.height + (fieldLayout.y ?? 0),
              left: fieldLayout.x ?? 0,
              width: fieldLayout.width,
              backgroundColor: theme.card,
              borderColor: theme.border,
              borderWidth: 1,
              borderRadius: theme.rounded.md,
              maxHeight,
              elevation: 6,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 2 },
              zIndex: 100,
            },
          ]}
        >
          {options.map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => {
                setOpen(false);
                onChange(item.value);
              }}
              style={{
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
                backgroundColor:
                  value === item.value ? theme.overlay : "transparent",
              }}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Text
                style={{
                  fontSize: theme.typography.size.base,
                  fontFamily: theme.typography.fontFamily.regular,
                  fontWeight: value === item.value ? "bold" : "normal",
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      {open && (
        <Pressable
          style={StyleSheet.absoluteFillObject}
          onPress={handleOutsidePress}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dropdown: {
    position: "absolute",
    overflow: "hidden",
  },
});
