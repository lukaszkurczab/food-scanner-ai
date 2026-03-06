import React, { useMemo } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton } from "@/components/PrimaryButton";
import { SecondaryButton } from "@/components/SecondaryButton";
import { ErrorButton } from "@/components/ErrorButton";

type GlobalActionButtonsProps = {
  label: string;
  onPress: () => void;
  secondaryLabel: string;
  secondaryOnPress: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryDisabled?: boolean;
  secondaryLoading?: boolean;
  primaryTestID?: string;
  secondaryTestID?: string;
  containerStyle?: StyleProp<ViewStyle>;
  primaryStyle?: StyleProp<ViewStyle>;
  secondaryStyle?: StyleProp<ViewStyle>;
  layout?: "stacked" | "row";
  rowOrder?: "primary-secondary" | "secondary-primary";
  secondaryVariant?: "secondary" | "error";
};

export const GlobalActionButtons: React.FC<GlobalActionButtonsProps> = ({
  label,
  onPress,
  secondaryLabel,
  secondaryOnPress,
  primaryDisabled = false,
  primaryLoading = false,
  secondaryDisabled = false,
  secondaryLoading = false,
  primaryTestID,
  secondaryTestID,
  containerStyle,
  primaryStyle,
  secondaryStyle,
  layout = "stacked",
  rowOrder = "primary-secondary",
  secondaryVariant = "secondary",
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const primaryElement = (
    <PrimaryButton
      label={label}
      onPress={onPress}
      disabled={primaryDisabled}
      loading={primaryLoading}
      testID={primaryTestID}
      style={primaryStyle}
    />
  );

  const secondaryElement =
    secondaryVariant === "error" ? (
      <ErrorButton
        label={secondaryLabel}
        onPress={secondaryOnPress}
        disabled={secondaryDisabled}
        loading={secondaryLoading}
        testID={secondaryTestID}
        style={secondaryStyle}
      />
    ) : (
      <SecondaryButton
        label={secondaryLabel}
        onPress={secondaryOnPress}
        disabled={secondaryDisabled}
        loading={secondaryLoading}
        testID={secondaryTestID}
        style={secondaryStyle}
      />
    );

  if (layout === "row") {
    const first =
      rowOrder === "secondary-primary" ? secondaryElement : primaryElement;
    const second =
      rowOrder === "secondary-primary" ? primaryElement : secondaryElement;

    return (
      <View style={[styles.rowContainer, containerStyle]}>
        <View style={styles.rowItem}>{first}</View>
        <View style={styles.rowItem}>{second}</View>
      </View>
    );
  }

  return (
    <View style={[styles.stackedContainer, containerStyle]}>
      {primaryElement}
      {secondaryElement}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    stackedContainer: {
      paddingTop: theme.spacing.sm,
      gap: theme.spacing.md,
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
