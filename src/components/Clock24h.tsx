import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);

export const Clock24h: React.FC<Props> = ({ value, onChange }) => {
  const theme = useTheme();

  const [hourText, setHourText] = useState<string>(pad2(value.getHours()));
  const [minuteText, setMinuteText] = useState<string>(
    pad2(value.getMinutes())
  );

  useEffect(() => {
    setHourText(pad2(value.getHours()));
    setMinuteText(pad2(value.getMinutes()));
  }, [value]);

  const commitHour = (txt: string) => {
    const n = parseInt(txt, 10);
    if (Number.isNaN(n)) {
      setHourText(pad2(value.getHours()));
      return;
    }
    const h = clamp(n, 0, 23);
    const d = new Date(value);
    d.setHours(h);
    onChange(d);
    setHourText(pad2(h));
  };

  const commitMinute = (txt: string) => {
    const n = parseInt(txt, 10);
    if (Number.isNaN(n)) {
      setMinuteText(pad2(value.getMinutes()));
      return;
    }
    const m = clamp(n, 0, 59);
    const d = new Date(value);
    d.setMinutes(m);
    onChange(d);
    setMinuteText(pad2(m));
  };

  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={hourText}
          onChangeText={(t) => setHourText(t.replace(/[^\d]/g, "").slice(0, 2))}
          onBlur={() => commitHour(hourText)}
          keyboardType="number-pad"
          maxLength={2}
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.card,
            },
          ]}
        />
        <Text style={{ fontSize: 32, fontWeight: "700", color: theme.text }}>
          :
        </Text>
        <TextInput
          value={minuteText}
          onChangeText={(t) =>
            setMinuteText(t.replace(/[^\d]/g, "").slice(0, 2))
          }
          onBlur={() => commitMinute(minuteText)}
          keyboardType="number-pad"
          maxLength={2}
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.card,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    width: 64,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "700",
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderRadius: 16,
  },
});
