import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  ScrollView,
  Modal,
  Dimensions,
  StyleProp,
  ViewStyle,
  StyleSheet,
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
  style?: StyleProp<ViewStyle>;
  renderLabel?: (option: Option<T>) => React.ReactNode;
};

type DropdownPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MENU_MAX_HEIGHT = 240;
const FIELD_MIN_HEIGHT = 48;
const SHADOW_OFFSET_Y = 2;

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
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

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

  const menuMaxHeight = dropdownPos
    ? Math.min(
        MENU_MAX_HEIGHT,
        Dimensions.get("window").height - (dropdownPos.y + dropdownPos.height)
      )
    : MENU_MAX_HEIGHT;
  const menuPositionStyle = useMemo(
    () =>
      dropdownPos
        ? {
            top: dropdownPos.y + dropdownPos.height,
            left: dropdownPos.x,
            width: dropdownPos.width,
            maxHeight: menuMaxHeight,
          }
        : null,
    [dropdownPos, menuMaxHeight]
  );

  return (
    <View style={style}>
      {label && <Text style={styles.label}>{label}</Text>}

      <Pressable
        ref={fieldRef}
        style={[
          styles.field,
          error ? styles.fieldError : null,
          disabled ? styles.fieldDisabled : null,
        ]}
        onPress={() => !disabled && openDropdown()}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <View style={styles.fieldContent}>
          {selected ? (
            renderLabel ? (
              renderLabel(selected)
            ) : (
              <Text style={styles.selectedText} numberOfLines={1}>
                {selected.label}
              </Text>
            )
          ) : null}
        </View>

        <MaterialIcons
          name={open ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={24}
          color={theme.textSecondary}
          style={styles.fieldIcon}
        />
      </Pressable>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {open && dropdownPos && (
        <Modal
          transparent
          animationType="none"
          visible={open}
          onRequestClose={handleOutsidePress}
        >
          <Pressable style={styles.modalOverlay} onPress={handleOutsidePress}>
            <View style={[styles.menu, menuPositionStyle]}>
              <ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator={false}
              >
                {options.map((item, idx) => {
                  const isSelected = value === item.value;

                  return (
                    <TouchableOpacity
                      key={`${item.value ?? "null"}-${idx}`}
                      onPress={() => {
                        setOpen(false);
                        onChange(item.value);
                      }}
                      style={[styles.option, isSelected && styles.optionSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                    >
                      {renderLabel ? (
                        renderLabel(item)
                      ) : (
                        <Text
                          style={[
                            styles.optionText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>
      )}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    label: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.sm,
      marginBottom: theme.spacing.xs / 2,
      fontFamily: theme.typography.fontFamily.medium,
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      minHeight: FIELD_MIN_HEIGHT,
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.card,
      shadowColor: theme.shadow,
      shadowOpacity: 0.12,
      shadowRadius: theme.spacing.sm,
      shadowOffset: { width: 0, height: SHADOW_OFFSET_Y },
      elevation: 3,
    },
    fieldError: {
      borderColor: theme.error.border,
    },
    fieldDisabled: {
      backgroundColor: theme.disabled.background,
      opacity: 0.6,
    },
    fieldContent: {
      flex: 1,
    },
    selectedText: {
      color: theme.text,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.regular,
    },
    fieldIcon: {
      marginLeft: theme.spacing.xs,
    },
    errorText: {
      color: theme.error.text,
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.sm,
    },
    modalOverlay: {
      flex: 1,
    },
    menu: {
      position: "absolute",
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: theme.rounded.sm,
      shadowColor: theme.shadow,
      shadowOpacity: 0.1,
      shadowRadius: theme.spacing.sm,
      shadowOffset: { width: 0, height: SHADOW_OFFSET_Y },
      elevation: 3,
      zIndex: 100,
    },
    option: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
    },
    optionSelected: {
      backgroundColor: theme.overlay,
    },
    optionText: {
      color: theme.text,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.regular,
      fontWeight: "normal",
    },
    optionTextSelected: {
      fontFamily: theme.typography.fontFamily.bold,
    },
  });
