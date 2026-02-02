import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";

type Option<T extends string> = {
  label: string;
  value: T | null;
};

type Props<T extends string> = {
  label?: string;
  value: T | null;
  options: Option<T>[];
  onChange: (value: T | null) => void;
  error?: string;
  disabled?: boolean;
  style?: any;
  renderLabel?: (option: Option<T>) => React.ReactNode;
};

export function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  error,
  disabled,
  style,
  renderLabel,
}: Props<T>) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const fieldRef = useRef<View>(null);

  const selected = options.find((o) => o.value === value) ?? null;

  const handleOutsidePress = () => setOpen(false);

  const openDropdown = () => {
    if (fieldRef.current) {
      fieldRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPos({ x, y, width, height });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  return (
    <View style={style}>
      {label && (
        <Text
          style={{
            color: theme.textSecondary,
            fontSize: theme.typography.size.sm,
            marginBottom: theme.spacing.xs / 2,
            fontFamily: theme.typography.fontFamily.medium,
          }}
        >
          {label}
        </Text>
      )}
      <Pressable
        ref={fieldRef}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          minHeight: 48,
          borderRadius: theme.rounded.sm,
          borderWidth: 1,
          borderColor: error ? theme.error.border : theme.border,
          backgroundColor: disabled ? theme.disabled.background : theme.card,
          opacity: disabled ? 0.6 : 1,
          shadowColor: theme.shadow,
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
        onPress={() => !disabled && openDropdown()}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <View style={{ flex: 1 }}>
          {selected ? (
            renderLabel ? (
              renderLabel(selected)
            ) : (
              <Text
                style={{
                  color: theme.text,
                  fontSize: theme.typography.size.base,
                  fontFamily: theme.typography.fontFamily.regular,
                }}
                numberOfLines={1}
              >
                {selected.label}
              </Text>
            )
          ) : null}
        </View>
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
      {open && dropdownPos && (
        <Modal
          transparent
          animationType="none"
          visible={open}
          onRequestClose={handleOutsidePress}
        >
          <Pressable style={{ flex: 1 }} onPress={handleOutsidePress}>
            <View
              style={{
                position: "absolute",
                top: dropdownPos.y + dropdownPos.height,
                left: dropdownPos.x,
                width: dropdownPos.width,
                backgroundColor: theme.card,
                borderColor: theme.border,
                borderWidth: 1,
                borderRadius: theme.rounded.sm,
                maxHeight: Math.min(
                  240,
                  Dimensions.get("window").height -
                    (dropdownPos.y + dropdownPos.height),
                ),
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
                zIndex: 100,
              }}
            >
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {options.map((item, idx) => (
                  <TouchableOpacity
                    key={`${item.value ?? "null"}-${idx}`}
                    onPress={() => {
                      setOpen(false);
                      onChange(item.value);
                    }}
                    style={{
                      paddingVertical: theme.spacing.md,
                      paddingHorizontal: theme.spacing.md,
                      backgroundColor:
                        value === item.value ? theme.overlay : "transparent",
                      zIndex: 100,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    {renderLabel ? (
                      renderLabel(item)
                    ) : (
                      <Text
                        style={{
                          color: theme.text,
                          fontSize: theme.typography.size.base,
                          fontFamily: theme.typography.fontFamily.regular,
                          fontWeight: value === item.value ? "bold" : "normal",
                        }}
                      >
                        {item.label}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}
