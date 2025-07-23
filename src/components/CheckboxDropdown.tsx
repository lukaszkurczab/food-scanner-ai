import React, {
  useState,
  useRef,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useTheme } from "@/src/theme/useTheme";
import { MaterialIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

type Option<T extends string | number> = {
  label: string;
  value: T;
  disabled?: boolean;
};

type CheckboxDropdownProps<T extends string | number> = {
  label?: string;
  options: Option<T>[];
  values: T[];
  onChange: (values: T[]) => void;
  error?: string;
  disabled?: boolean;
  disabledValues?: T[];
  style?: any;
  renderLabel?: (option: Option<T>) => React.ReactNode;
};

export function CheckboxDropdown<T extends string | number>({
  label,
  options,
  values,
  onChange,
  error,
  disabled,
  disabledValues,
  style,
  renderLabel,
}: CheckboxDropdownProps<T>) {
  const theme = useTheme();
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const fieldRef = useRef<View>(null);

  const blockedSet = useMemo(() => {
    const s = new Set<T>(disabledValues ?? []);
    options.forEach((o) => {
      if (o.disabled) s.add(o.value);
    });
    return s;
  }, [options, disabledValues]);

  const selectedLabels = useMemo(
    () =>
      options
        .filter((o) => values.includes(o.value))
        .map((o) => o.label)
        .join(", "),
    [values, options]
  );

  const updateDropdownPosition = useCallback(() => {
    if (fieldRef.current) {
      fieldRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPos({ x, y, width, height });
      });
    }
  }, []);

  const openDropdown = () => {
    if (disabled) return;
    setOpen(true);
    setTimeout(updateDropdownPosition, 1);
  };

  useEffect(() => {
    if (!open) return;
    updateDropdownPosition();
    const subscription = Dimensions.addEventListener(
      "change",
      updateDropdownPosition
    );
    return () => subscription?.remove();
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(updateDropdownPosition, 200);
    return () => clearInterval(interval);
  }, [open, updateDropdownPosition]);

  const handleToggle = (v: T) => {
    if (disabled || blockedSet.has(v)) return;
    if (values.includes(v)) {
      onChange(values.filter((x) => x !== v));
    } else {
      onChange([...values, v]);
    }
  };

  const maxHeight = dropdownPos
    ? Math.min(
        260,
        Dimensions.get("window").height -
          (dropdownPos.y + dropdownPos.height) -
          32
      )
    : 260;

  return (
    <View style={style}>
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
        ref={fieldRef}
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
        onPress={openDropdown}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Text
          style={{
            color: selectedLabels ? theme.text : theme.textSecondary,
            fontSize: theme.typography.size.base,
            flex: 1,
            fontFamily: theme.typography.fontFamily.regular,
          }}
          numberOfLines={1}
        >
          {selectedLabels || t("none")}
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
      {open && dropdownPos && (
        <Modal
          transparent
          animationType="none"
          visible={open}
          onRequestClose={() => setOpen(false)}
        >
          <View style={{ flex: 1 }}>
            <Pressable
              style={[StyleSheet.absoluteFillObject, { zIndex: 1 }]}
              onPress={() => setOpen(false)}
            />
            <View
              style={{
                position: "absolute",
                top: dropdownPos.y + dropdownPos.height,
                left: dropdownPos.x,
                width: dropdownPos.width,
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
                zIndex: 2,
              }}
            >
              <ScrollView
                nestedScrollEnabled={true}
                contentContainerStyle={{ flexGrow: 1 }}
                keyboardShouldPersistTaps="handled"
              >
                {options.map((item) => {
                  const isSelected = values.includes(item.value);
                  const isDisabled = disabled || blockedSet.has(item.value);
                  return (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => handleToggle(item.value)}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        paddingVertical: theme.spacing.md,
                        paddingHorizontal: theme.spacing.md,
                        backgroundColor: isSelected
                          ? theme.overlay
                          : "transparent",
                        opacity: isDisabled ? 0.4 : 1,
                      }}
                      accessibilityRole="checkbox"
                      accessibilityLabel={item.label}
                      accessibilityState={{
                        checked: isSelected,
                        disabled: isDisabled,
                      }}
                      disabled={isDisabled}
                    >
                      <MaterialIcons
                        name={
                          isSelected ? "check-box" : "check-box-outline-blank"
                        }
                        size={22}
                        color={
                          isSelected
                            ? theme.accentSecondary ?? theme.accent
                            : isDisabled
                            ? theme.textSecondary
                            : theme.textSecondary
                        }
                        style={{ marginRight: 8 }}
                      />
                      <Text
                        style={{
                          color: isDisabled ? theme.textSecondary : theme.text,
                          fontSize: theme.typography.size.base,
                          fontFamily: theme.typography.fontFamily.regular,
                          flex: 1,
                        }}
                      >
                        {renderLabel ? renderLabel(item) : item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}
