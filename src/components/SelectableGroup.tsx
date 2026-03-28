import { useMemo } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

export type SelectableOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  disabled?: boolean;
  testID?: string;
};

type SelectableGroupProps<T extends string> = {
  label?: string;
  helperText?: string;
  error?: string;
  options: SelectableOption<T>[];
  value?: T | null;
  values?: T[];
  onChange: (value: T) => void;
  selectionMode?: "single" | "multiple";
  variant?: "chip" | "card";
  columns?: 1 | 2 | 3;
  style?: StyleProp<ViewStyle>;
};

const COLUMN_WIDTHS: Record<1 | 2 | 3, `${number}%`> = {
  1: "100%",
  2: "48%",
  3: "31.5%",
};

export function SelectableGroup<T extends string>({
  label,
  helperText,
  error,
  options,
  value,
  values,
  onChange,
  selectionMode = "single",
  variant = "chip",
  columns = 1,
  style,
}: SelectableGroupProps<T>) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const selectedValues = values ?? (value ? [value] : []);
  const isMultiple = selectionMode === "multiple";
  const widthStyle =
    variant === "card" || columns > 1
      ? {
          width: COLUMN_WIDTHS[columns],
        }
      : null;

  return (
    <View style={style}>
      {label ? <Text style={styles.groupLabel}>{label}</Text> : null}

      <View style={variant === "card" ? styles.cardWrap : styles.chipWrap}>
        {options.map((option) => {
          const selected = selectedValues.includes(option.value);
          const disabled = !!option.disabled;

          return (
            <Pressable
              key={option.value}
              accessibilityRole={isMultiple ? "checkbox" : "radio"}
              accessibilityLabel={option.label}
              accessibilityState={{
                checked: selected,
                selected,
                disabled,
              }}
              disabled={disabled}
              onPress={() => {
                if (disabled) return;
                if (!isMultiple && selected) return;
                onChange(option.value);
              }}
              style={({ pressed }) => [
                variant === "card" ? styles.cardOption : styles.chipOption,
                widthStyle,
                selected
                  ? variant === "card"
                    ? styles.cardOptionSelected
                    : styles.chipOptionSelected
                  : null,
                disabled ? styles.optionDisabled : null,
                pressed && !disabled ? styles.optionPressed : null,
              ]}
              testID={option.testID}
            >
              <Text
                style={[
                  variant === "card" ? styles.cardLabel : styles.chipLabel,
                  selected ? styles.selectedText : null,
                ]}
              >
                {option.label}
              </Text>

              {variant === "card" && option.description ? (
                <Text
                  style={[
                    styles.cardDescription,
                    selected ? styles.selectedDescription : null,
                  ]}
                >
                  {option.description}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    groupLabel: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.labelL,
      lineHeight: theme.typography.lineHeight.labelL,
      fontFamily: theme.typography.fontFamily.medium,
      marginBottom: theme.spacing.sm,
    },
    chipWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    cardWrap: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    chipOption: {
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.rounded.full,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      alignItems: "center",
      justifyContent: "center",
    },
    chipOptionSelected: {
      borderColor: theme.primaryStrong,
      backgroundColor: theme.primaryStrong,
    },
    cardOption: {
      minHeight: 72,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.rounded.lg,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
      gap: theme.spacing.xxs,
    },
    cardOptionSelected: {
      borderColor: theme.primaryStrong,
      backgroundColor: theme.primarySoft,
    },
    chipLabel: {
      color: theme.text,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.semiBold,
      textAlign: "center",
    },
    cardLabel: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
    cardDescription: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.regular,
    },
    selectedText: {
      color: theme.textInverse,
    },
    selectedDescription: {
      color: theme.textInverse,
    },
    optionDisabled: {
      opacity: 0.45,
    },
    optionPressed: {
      opacity: 0.88,
    },
    helperText: {
      marginTop: theme.spacing.xs,
      color: theme.textSecondary,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.regular,
    },
    errorText: {
      marginTop: theme.spacing.xs,
      color: theme.error.text,
      fontSize: theme.typography.size.caption,
      lineHeight: theme.typography.lineHeight.caption,
      fontFamily: theme.typography.fontFamily.medium,
    },
  });
