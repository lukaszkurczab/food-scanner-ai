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
import { Checkbox } from "@/components/Checkbox";

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
    [values, options],
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
      updateDropdownPosition,
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
        onPress={openDropdown}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled, expanded: open }}
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
          onRequestClose={() => setOpen(false)}
        >
          <View style={styles.modalRoot}>
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setOpen(false)}
            />

            <View style={[styles.menu, menuPositionStyle]}>
              <ScrollView
                nestedScrollEnabled
                contentContainerStyle={styles.menuContent}
                keyboardShouldPersistTaps="handled"
              >
                {options.map((item) => {
                  const isSelected = values.includes(item.value);
                  const isDisabled = !!disabled || blockedSet.has(item.value);

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
                      activeOpacity={0.75}
                    >
                      <Checkbox
                        checked={isSelected}
                        onChange={() => handleToggle(item.value)}
                        disabled={isDisabled}
                        style={styles.optionCheckbox}
                        accessibilityLabel={item.label}
                      />

                      <View style={styles.optionLabelWrap}>
                        {renderLabel ? (
                          renderLabel(item)
                        ) : (
                          <Text
                            style={[
                              styles.optionText,
                              isDisabled ? styles.optionTextDisabled : null,
                            ]}
                          >
                            {item.label}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
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
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.input.border,
      backgroundColor: theme.input.background,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.16 : 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: SHADOW_OFFSET_Y },
      elevation: 2,
      minHeight: 52,
    },
    fieldError: {
      borderColor: theme.input.borderError,
    },
    fieldDisabled: {
      backgroundColor: theme.input.backgroundDisabled,
      opacity: 0.6,
    },
    valueText: {
      color: theme.input.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      flex: 1,
      fontFamily: theme.typography.fontFamily.regular,
    },
    valueTextPlaceholder: {
      color: theme.input.placeholder,
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
    modalRoot: {
      flex: 1,
    },
    modalOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "transparent",
      zIndex: 1,
    },
    menu: {
      position: "absolute",
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: theme.rounded.lg,
      elevation: 8,
      shadowColor: "#000000",
      shadowOpacity: theme.isDark ? 0.2 : 0.1,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: SHADOW_OFFSET_Y },
      zIndex: 2,
      overflow: "hidden",
    },
    menuContent: {
      flexGrow: 1,
      paddingVertical: theme.spacing.xs,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.md,
      backgroundColor: "transparent",
      opacity: 1,
      minHeight: 48,
    },
    optionSelected: {
      backgroundColor: theme.primarySoft,
    },
    optionDisabled: {
      opacity: 0.45,
    },
    optionCheckbox: {
      marginRight: theme.spacing.sm,
    },
    optionLabelWrap: {
      flex: 1,
    },
    optionText: {
      color: theme.text,
      fontSize: theme.typography.size.bodyL,
      lineHeight: theme.typography.lineHeight.bodyL,
      fontFamily: theme.typography.fontFamily.regular,
      flex: 1,
    },
    optionTextDisabled: {
      color: theme.textSecondary,
    },
  });
