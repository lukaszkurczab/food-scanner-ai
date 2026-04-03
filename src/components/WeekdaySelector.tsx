import React, { useMemo } from "react";
import { View, Pressable, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  value: number[];
  onChange: (next: number[]) => void;
  labels?: string[];
};

const labels = ["S", "M", "T", "W", "T", "F", "S"];
const displayOrder = [1, 2, 3, 4, 5, 6, 0];

export const WeekdaySelector: React.FC<Props> = ({
  value,
  onChange,
  labels: customLabels,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const weekdayLabels = customLabels ?? labels;

  return (
    <View style={styles.row}>
      {displayOrder.map((idx) => {
        const active = value.includes(idx);
        const label = weekdayLabels[idx] ?? labels[idx];

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
            testID={`weekday-chip-${idx}`}
          >
            <Text
              style={[
                styles.dayLabelBase,
                active ? styles.dayLabelActive : styles.dayLabelIdle,
              ]}
            >
              {label}
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
      alignItems: "stretch",
      gap: theme.spacing.xxs,
    },
    dayChipBase: {
      flex: 1,
      minWidth: 0,
      minHeight: 40,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.xs,
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
      textAlign: "center",
    },
    dayLabelActive: {
      color: theme.primaryStrong,
    },
    dayLabelIdle: {
      color: theme.text,
    },
  });
