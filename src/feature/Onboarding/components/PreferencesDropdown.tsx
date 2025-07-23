import React, { useState, useRef, useMemo } from "react";
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
import { Preference } from "../types";

const PREFERENCE_OPTIONS: { label: string; value: Preference }[] = [
  { label: "preferences.lowCarb", value: "lowCarb" },
  { label: "preferences.keto", value: "keto" },
  { label: "preferences.highProtein", value: "highProtein" },
  { label: "preferences.highCarb", value: "highCarb" },
  { label: "preferences.lowFat", value: "lowFat" },
  { label: "preferences.balanced", value: "balanced" },
  { label: "preferences.vegetarian", value: "vegetarian" },
  { label: "preferences.vegan", value: "vegan" },
  { label: "preferences.pescatarian", value: "pescatarian" },
  { label: "preferences.mediterranean", value: "mediterranean" },
  { label: "preferences.glutenFree", value: "glutenFree" },
  { label: "preferences.dairyFree", value: "dairyFree" },
  { label: "preferences.paleo", value: "paleo" },
];

const PREFERENCE_CONFLICTS: Record<Preference, Preference[]> = {
  lowCarb: ["highCarb", "balanced", "keto"],
  keto: ["highCarb", "balanced", "lowFat", "lowCarb"],
  highProtein: [],
  highCarb: ["keto", "lowCarb"],
  lowFat: ["keto"],
  balanced: ["keto", "lowCarb"],
  vegetarian: ["vegan", "pescatarian"],
  vegan: ["vegetarian", "pescatarian"],
  pescatarian: ["vegan", "vegetarian"],
  mediterranean: [],
  glutenFree: [],
  dairyFree: [],
  paleo: [],
};

type Props = {
  values: Preference[];
  onChange: (values: Preference[]) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  style?: any;
};

export const PreferencesDropdown: React.FC<Props> = ({
  values,
  onChange,
  label,
  error,
  disabled,
  style,
}) => {
  const theme = useTheme();
  const { t } = useTranslation("onboarding");
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const fieldRef = useRef<View>(null);

  const disabledValues = useMemo(() => {
    const blocked = new Set<Preference>();
    for (const v of values) {
      (PREFERENCE_CONFLICTS[v] ?? []).forEach((b) => blocked.add(b));
    }
    return blocked;
  }, [values]);

  const selectedLabels = useMemo(
    () =>
      PREFERENCE_OPTIONS.filter((o) => values.includes(o.value))
        .map((o) => t(o.label))
        .join(", "),
    [values, t]
  );

  const openDropdown = () => {
    if (disabled) return;
    if (fieldRef.current) {
      fieldRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPos({ x, y, width, height });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  const handleToggle = (v: Preference) => {
    if (disabled || disabledValues.has(v)) return;
    if (values.includes(v)) {
      const newVals = values.filter((x) => x !== v);
      onChange(newVals);
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
          {selectedLabels || t("preferences.none")}
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
              style={{ ...StyleSheet.absoluteFillObject, zIndex: 1 }}
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
                {PREFERENCE_OPTIONS.map((item) => {
                  const isSelected = values.includes(item.value);
                  const isDisabled = disabled || disabledValues.has(item.value);
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
                      accessibilityLabel={t(item.label)}
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
                            ? theme.accentSecondary
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
                        {t(item.label)}
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
};
