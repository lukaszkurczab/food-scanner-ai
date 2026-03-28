import { useTheme } from "@/theme/useTheme";

export const PICKER_MENU_MAX_HEIGHT = 256;
export const PICKER_MENU_BOTTOM_OFFSET = 24;
export const PICKER_FIELD_MIN_HEIGHT = 56;

export function getPickerControlStyleParts(theme: ReturnType<typeof useTheme>) {
  return {
    label: {
      color: theme.textSecondary,
      fontSize: theme.typography.size.labelS,
      lineHeight: theme.typography.lineHeight.labelS,
      marginBottom: theme.spacing.xs,
      fontFamily: theme.typography.fontFamily.medium,
    },
    field: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: 14,
      minHeight: PICKER_FIELD_MIN_HEIGHT,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      borderColor: theme.input.border,
      backgroundColor: theme.input.background,
    },
    fieldOpen: {
      borderColor: theme.input.borderFocused,
      shadowColor: theme.primary,
      shadowOpacity: theme.isDark ? 0.22 : 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
    },
    fieldError: {
      borderColor: theme.input.borderError,
    },
    fieldDisabled: {
      backgroundColor: theme.input.backgroundDisabled,
      borderColor: theme.input.borderDisabled,
      opacity: 0.68,
    },
    valueText: {
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
      marginLeft: theme.spacing.sm,
      transform: [{ rotate: "-90deg" }],
    },
    fieldIconOpen: {
      transform: [{ rotate: "90deg" }],
    },
    errorText: {
      color: theme.error.text,
      marginTop: theme.spacing.xs,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
      fontFamily: theme.typography.fontFamily.medium,
    },
    menu: {
      position: "absolute" as const,
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
      borderWidth: 1,
      borderRadius: theme.rounded.lg,
      shadowColor: theme.shadow,
      shadowOpacity: theme.isDark ? 0.22 : 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 10,
      zIndex: 100,
      overflow: "hidden" as const,
    },
    menuContent: {
      paddingVertical: theme.spacing.xs,
    },
    option: {
      minHeight: 52,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      justifyContent: "center" as const,
    },
    optionSelected: {
      backgroundColor: theme.surfaceAlt,
    },
    optionText: {
      color: theme.text,
      fontSize: theme.typography.size.bodyM,
      lineHeight: theme.typography.lineHeight.bodyM,
      fontFamily: theme.typography.fontFamily.regular,
    },
    optionTextSelected: {
      color: theme.primary,
      fontFamily: theme.typography.fontFamily.semiBold,
    },
  };
}
