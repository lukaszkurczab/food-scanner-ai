import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

export type RangeOption = { key: string; label: string };

type RangeTabsProps = {
  options: RangeOption[];
  active: string;
  onChange: (key: string) => void;
};

export const RangeTabs: React.FC<RangeTabsProps> = ({
  options,
  active,
  onChange,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const containerStyle = useMemo(
    () => ({
      backgroundColor: theme.card,
      borderRadius: theme.rounded.full,
      padding: theme.spacing.xs,
      borderColor: theme.border,
    }),
    [theme.card, theme.rounded.full, theme.spacing.xs, theme.border]
  );
  const getTabStateStyle = (isActive: boolean) => ({
    backgroundColor: isActive ? theme.accentSecondary : "transparent",
  });
  const getTabTextStyle = (isActive: boolean) => ({
    color: isActive ? theme.onAccent : theme.textSecondary,
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {options.map((opt) => {
        const isActive = active === opt.key;

        return (
          <Pressable
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={({ pressed }) => [
              styles.tab,
              getTabStateStyle(isActive),
              pressed ? styles.tabPressed : null,
            ]}
          >
            <Text style={[styles.tabText, getTabTextStyle(isActive)]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      alignSelf: "stretch",
      gap: theme.spacing.xs,
      borderWidth: 1,
    },
    tab: {
      flex: 1,
      paddingVertical: theme.spacing.sm - theme.spacing.xs / 2,
      paddingHorizontal: theme.spacing.sm,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: theme.rounded.full,
    },
    tabPressed: {
      opacity: 0.9,
    },
    tabText: {
      fontSize: theme.typography.size.base,
      fontFamily: theme.typography.fontFamily.medium,
      textAlign: "center",
    },
  });
