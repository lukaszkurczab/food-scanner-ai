import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
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
  const [open, setOpen] = useState(false);
  const value = new Date();
  value.setHours(hour, minute, 0, 0);
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: theme.text,
          fontFamily: theme.typography.fontFamily.medium,
        }}
      >
        {label}
      </Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={{
          borderWidth: 1,
          borderColor: theme.border,
          paddingVertical: theme.spacing.md,
          paddingHorizontal: theme.spacing.lg,
          borderRadius: theme.rounded.md,
        }}
      >
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.typography.fontFamily.regular,
          }}
        >
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
