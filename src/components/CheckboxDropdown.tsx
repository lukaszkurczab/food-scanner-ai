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
  StyleProp,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";
import AppIcon from "@/components/AppIcon";
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
  style?: StyleProp<ViewStyle>;
  renderLabel?: (option: Option<T>) => React.ReactNode;
};

type DropdownPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MENU_MAX_HEIGHT = 260;
const MENU_BOTTOM_OFFSET = 32;
const SHADOW_OFFSET_Y = 2;

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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { t } = useTranslation("common");

  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<DropdownPosition | null>(null);

  const fieldRef = useRef<View>(null);

  const blockedSet = useMemo(() => {
    const set = new Set<T>(disabledValues ?? []);
    options.forEach((option) => {
      if (option.disabled) set.add(option.value);
    });
    return set;
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
    if (!fieldRef.current) return;

    fieldRef.current.measureInWindow((x, y, width, height) => {
      setDropdownPos({ x, y, width, height });
    });
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

  const handleToggle = (value: T) => {
    if (disabled || blockedSet.has(value)) return;

    if (values.includes(value)) {
      onChange(values.filter((item) => item !== value));
      return;
    }

    onChange([...values, value]);
  };

  const menuMaxHeight = dropdownPos
    ? Math.min(
        MENU_MAX_HEIGHT,
        Dimensions.get("window").height -
          (dropdownPos.y + dropdownPos.height) -
          MENU_BOTTOM_OFFSET
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
          style,
        ]}
        onPress={openDropdown}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
      >
        <Text
          style={[
            styles.valueText,
            !selectedLabels ? styles.valueTextPlaceholder : null,
          ]}
          numberOfLines={1}
        >
          {selectedLabels || t("none")}
        </Text>

        <AppIcon
          name={open ? "chevron-up" : "chevron-down"}
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
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setOpen(false)}
            />

            <View
              style={[styles.menu, menuPositionStyle]}
            >
              <ScrollView
                nestedScrollEnabled
                contentContainerStyle={styles.menuContent}
                keyboardShouldPersistTaps="handled"
              >
                {options.map((item) => {
                  const isSelected = values.includes(item.value);
                  const isDisabled = disabled || blockedSet.has(item.value);

                  return (
                    <TouchableOpacity
                      key={String(item.value)}
                      onPress={() => handleToggle(item.value)}
                      style={[
                        styles.option,
                        isSelected ? styles.optionSelected : null,
                        isDisabled ? styles.optionDisabled : null,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityLabel={item.label}
                      accessibilityState={{
                        checked: isSelected,
                        disabled: isDisabled,
                      }}
                      disabled={isDisabled}
                    >
                      <AppIcon
                        name={
                          isSelected ? "checkbox" : "checkbox-empty"
                        }
                        size={22}
                        color={
                          isSelected
                            ? theme.accentSecondary ?? theme.accent
                            : theme.textSecondary
                        }
                        style={styles.optionIcon}
                      />

                      <Text
                        style={[
                          styles.optionText,
                          isDisabled ? styles.optionTextDisabled : null,
                        ]}
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
      padding: theme.spacing.md,
      borderRadius: theme.rounded.md,
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
    valueText: {
      color: theme.text,
      fontSize: theme.typography.size.base,
      flex: 1,
      fontFamily: theme.typography.fontFamily.regular,
    },
    valueTextPlaceholder: {
      color: theme.textSecondary,
    },
    fieldIcon: {
      marginLeft: theme.spacing.xs,
    },
    errorText: {
      color: theme.error.text,
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.sm,
    },
    modalRoot: {
      flex: 1,
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1,
    },
    menu: {
      position: "absolute",
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: theme.rounded.md,
      elevation: 6,
      shadowColor: theme.shadow,
      shadowOpacity: 0.1,
      shadowRadius: theme.spacing.sm,
      shadowOffset: { width: 0, height: SHADOW_OFFSET_Y },
      zIndex: 2,
    },
    menuContent: {
      flexGrow: 1,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: "transparent",
      opacity: 1,
    },
    optionSelected: {
      backgroundColor: theme.overlay,
    },
    optionDisabled: {
      opacity: 0.4,
    },
    optionIcon: {
      marginRight: theme.spacing.sm,
    },
    optionText: {
      color: theme.text,
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.regular,
      flex: 1,
    },
    optionTextDisabled: {
      color: theme.textSecondary,
    },
  });
