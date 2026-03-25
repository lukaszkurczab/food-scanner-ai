import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { Button } from "@/components/Button";

type ActionTone = "primary" | "secondary" | "ghost" | "destructive";
type LegacyActionVariant = "default" | "secondary" | "error";

type GlobalActionButtonsProps = {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
  tone?: ActionTone;
  primaryLoading?: boolean;
  primaryDisabled?: boolean;
  primaryTestID?: string;
  primaryVariant?: LegacyActionVariant;

  secondaryLabel?: string;
  secondaryOnPress?: () => void;
  secondaryLoading?: boolean;
  secondaryDisabled?: boolean;
  secondaryTestID?: string;
  secondaryTone?: ActionTone;
  secondaryVariant?: LegacyActionVariant;

  containerStyle?: StyleProp<ViewStyle>;
  primaryStyle?: StyleProp<ViewStyle>;
  secondaryStyle?: StyleProp<ViewStyle>;
  layout?: "column" | "row";
  rowOrder?: "primary-secondary" | "secondary-primary";
};

export const GlobalActionButtons: React.FC<GlobalActionButtonsProps> = ({
  label,
  onPress,
  loading = false,
  disabled = false,
  testID,
  tone,
  primaryLoading,
  primaryDisabled,
  primaryTestID,
  primaryVariant,

  secondaryLabel,
  secondaryOnPress,
  secondaryLoading = false,
  secondaryDisabled = false,
  secondaryTestID,
  secondaryTone,
  secondaryVariant,

  containerStyle,
  primaryStyle,
  secondaryStyle,
  layout = "column",
  rowOrder = "primary-secondary",
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const normalizeTone = (
    actionTone: ActionTone | undefined,
    variant: LegacyActionVariant | undefined,
    fallback: ActionTone,
  ): ActionTone => {
    if (actionTone) return actionTone;
    if (variant === "error") return "destructive";
    if (variant === "secondary") return "secondary";
    return fallback;
  };

  const renderButton = ({
    buttonLabel,
    buttonOnPress,
    buttonLoading,
    buttonDisabled,
    buttonTestID,
    buttonTone,
    buttonStyle,
  }: {
    buttonLabel: string;
    buttonOnPress?: () => void;
    buttonLoading?: boolean;
    buttonDisabled?: boolean;
    buttonTestID?: string;
    buttonTone: ActionTone;
    buttonStyle?: StyleProp<ViewStyle>;
  }) => {
    return (
      <Button
        label={buttonLabel}
        variant={buttonTone}
        onPress={buttonOnPress}
        disabled={buttonDisabled}
        loading={buttonLoading}
        testID={buttonTestID}
        style={buttonStyle}
      />
    );
  };

  const primaryElement = renderButton({
    buttonLabel: label,
    buttonOnPress: onPress,
    buttonLoading: primaryLoading ?? loading,
    buttonDisabled: primaryDisabled ?? disabled,
    buttonTestID: primaryTestID ?? testID,
    buttonTone: normalizeTone(tone, primaryVariant, "primary"),
    buttonStyle: primaryStyle,
  });

  const secondaryElement =
    secondaryLabel != null
      ? renderButton({
          buttonLabel: secondaryLabel,
          buttonOnPress: secondaryOnPress,
          buttonLoading: secondaryLoading,
          buttonDisabled: secondaryDisabled,
          buttonTestID: secondaryTestID,
          buttonTone: normalizeTone(secondaryTone, secondaryVariant, "secondary"),
          buttonStyle: secondaryStyle,
        })
      : null;

  if (layout === "row") {
    const first =
      rowOrder === "secondary-primary" ? secondaryElement : primaryElement;
    const second =
      rowOrder === "secondary-primary" ? primaryElement : secondaryElement;

    return (
      <View style={[styles.rowContainer, containerStyle]}>
        {first ? <View style={styles.rowItem}>{first}</View> : null}
        {second ? <View style={styles.rowItem}>{second}</View> : null}
      </View>
    );
  }

  return (
    <View style={[styles.columnContainer, containerStyle]}>
      {primaryElement}
      {secondaryElement}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    columnContainer: {
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    rowContainer: {
      flexDirection: "row",
      gap: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      alignItems: "center",
    },
    rowItem: {
      flex: 1,
    },
  });
