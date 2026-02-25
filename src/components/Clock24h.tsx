import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { TimePartInput } from "./TimePartInput";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const INPUT_WIDTH = 64;

export const Clock24h: React.FC<Props> = ({ value, onChange }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const [hourText, setHourText] = useState<string>(pad2(value.getHours()));
  const [minuteText, setMinuteText] = useState<string>(
    pad2(value.getMinutes())
  );

  useEffect(() => {
    setHourText(pad2(value.getHours()));
    setMinuteText(pad2(value.getMinutes()));
  }, [value]);

  const currentHour = value.getHours();
  const currentMinute = value.getMinutes();

  return (
    <View style={styles.container}>
      <View style={styles.timeRow}>
        <TimePartInput
          value={hourText}
          onChangeText={setHourText}
          onCommit={(hour) => {
            const d = new Date(value);
            d.setHours(hour);
            onChange(d);
          }}
          min={0}
          max={23}
          fallbackValue={currentHour}
          style={styles.input}
        />
        <Text style={styles.separator}>:</Text>
        <TimePartInput
          value={minuteText}
          onChangeText={setMinuteText}
          onCommit={(minute) => {
            const d = new Date(value);
            d.setMinutes(minute);
            onChange(d);
          }}
          min={0}
          max={59}
          fallbackValue={currentMinute}
          style={styles.input}
        />
      </View>
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      alignItems: "center",
      gap: theme.spacing.sm + theme.spacing.xs,
    },
    timeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
    },
    input: {
      width: INPUT_WIDTH,
      textAlign: "center",
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.typography.fontFamily.bold,
      paddingVertical: theme.spacing.sm - 2,
      paddingHorizontal: theme.spacing.xs,
      borderWidth: 1,
      borderRadius: theme.rounded.md,
      color: theme.text,
      borderColor: theme.border,
      backgroundColor: theme.card,
    },
    separator: {
      fontSize: theme.typography.size.xxl,
      fontFamily: theme.typography.fontFamily.bold,
      color: theme.text,
    },
  });
