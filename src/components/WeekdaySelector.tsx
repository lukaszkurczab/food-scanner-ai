import React, { useMemo } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  value: number[];
  onChange: (next: number[]) => void;
};

const labels = ["S", "M", "T", "W", "T", "F", "S"];

export const WeekdaySelector: React.FC<Props> = ({ value, onChange }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      {labels.map((l, idx) => {
        const active = value.includes(idx);

        return (
          <Pressable
            key={idx}
            onPress={() => {
              const set = new Set(value);
              if (set.has(idx)) set.delete(idx);
              else set.add(idx);
              onChange(Array.from(set).sort((a, b) => a - b));
            }}
            style={[
              styles.dayChipBase,
              active ? styles.dayChipActive : styles.dayChipIdle,
            ]}
          >
            <Text
              style={[
                styles.dayLabelBase,
                active ? styles.dayLabelActive : styles.dayLabelIdle,
              ]}
            >
              {l}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    row: {
      flexDirection: "row",
      gap: theme.spacing.sm,
    },
    dayChipBase: {
      minWidth: 40,
      minHeight: 40,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      borderRadius: theme.rounded.md,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    dayChipActive: {
      backgroundColor: theme.primarySoft,
      borderColor: theme.primary,
    },
    dayChipIdle: {
      backgroundColor: theme.surfaceElevated,
      borderColor: theme.border,
    },
    dayLabelBase: {
      fontFamily: theme.typography.fontFamily.medium,
      fontSize: theme.typography.size.bodyS,
      lineHeight: theme.typography.lineHeight.bodyS,
    },
    dayLabelActive: {
      color: theme.primaryStrong,
    },
    dayLabelIdle: {
      color: theme.text,
    },
  });
