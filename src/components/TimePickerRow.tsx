import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/theme/useTheme";

type Props = {
  hour: number;
  minute: number;
  onChange: (t: { hour: number; minute: number }) => void;
  label: string;
};

export const TimePickerRow: React.FC<Props> = ({
  hour,
  minute,
  onChange,
  label,
}) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);
  const [open, setOpen] = useState(false);
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => setOpen(true)} style={styles.input}>
        <Text style={styles.valueText}>
          {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
        </Text>
      </Pressable>
      {open && (
        <DateTimePicker
          mode="time"
          value={value}
          onChange={(_, d) => {
            if (d) onChange({ hour: d.getHours(), minute: d.getMinutes() });
            setOpen(false);
          }}
        />
      )}
    </View>
  );
};

const makeStyles = (theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
    },
    label: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.medium,
    },
    input: {
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.rounded.md,
      backgroundColor: theme.card,
    },
    valueText: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });
