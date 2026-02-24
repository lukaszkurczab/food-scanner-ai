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
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);

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
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      borderRadius: theme.rounded.sm,
      borderWidth: 1,
    },
    dayChipActive: {
      backgroundColor: theme.accentSecondary,
      borderColor: theme.accentSecondary,
    },
    dayChipIdle: {
      backgroundColor: theme.card,
      borderColor: theme.border,
    },
    dayLabelBase: {
      fontFamily: theme.typography.fontFamily.medium,
    },
    dayLabelActive: {
      color: theme.onAccent,
    },
    dayLabelIdle: {
      color: theme.text,
    },
  });
