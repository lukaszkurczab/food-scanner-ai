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
import AppIcon from "@/components/AppIcon";

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
const FIELD_MIN_HEIGHT = 52;
const MENU_BOTTOM_OFFSET = 24;
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
        Dimensions.get("window").height -
          (dropdownPos.y + dropdownPos.height) -
          MENU_BOTTOM_OFFSET,
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
    [dropdownPos, menuMaxHeight],
  );

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

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
        accessibilityState={{ disabled, expanded: open }}
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
          ) : (
            <Text style={styles.placeholderText} numberOfLines={1}>
              —
            </Text>
          )}
        </View>

        <AppIcon
          name={open ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.textSecondary}
          style={styles.fieldIcon}
        />
      </Pressable>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {open && dropdownPos ? (
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
                contentContainerStyle={styles.menuContent}
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
                      style={[
                        styles.option,
                        isSelected ? styles.optionSelected : null,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                      activeOpacity={0.75}
                    >
                      {renderLabel ? (
                        renderLabel(item)
                      ) : (
                        <Text
                          style={[
                            styles.optionText,
                            isSelected ? styles.optionTextSelected : null,
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
      ) : null}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    label: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.labelL,
      lineHeight: theme.typography.lineHeight.labelL,
      marginBottom: theme.spacing.xs,
      fontFamily: theme.typography.fontFamily.medium,
    },
    field: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      minHeight: FIELD_MIN_HEIGHT,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.input.border,
      backgroundColor: theme.input.background,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.16 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: SHADOW_OFFSET_Y },
      elevation: 2,
    },
    fieldError: {
      borderColor: theme.input.borderError,
    },
    fieldDisabled: {
      backgroundColor: theme.input.backgroundDisabled,
      opacity: 0.6,
    },
    fieldContent: {
      flex: 1,
      justifyContent: "center",
    },
    selectedText: {
      color: theme.input.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
    },
    placeholderText: {
      color: theme.input.placeholder,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
    },
    fieldIcon: {
      marginLeft: theme.spacing.xs,
    },
    errorText: {
      color: theme.error.text,
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "transparent",
    },
    menu: {
      position: "absolute",
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: theme.rounded.lg,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.2 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: SHADOW_OFFSET_Y },
      elevation: 8,
      zIndex: 100,
      overflow: "hidden",
    },
    menuContent: {
      paddingVertical: theme.spacing.xs,
    },
    option: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      minHeight: 48,
      justifyContent: "center",
    },
    optionSelected: {
      backgroundColor: theme.primarySoft,
    },
    optionText: {
      color: theme.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
    },
    optionTextSelected: {
      color: theme.primaryStrong,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  });
