import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);

export const Clock12h: React.FC<Props> = ({ value, onChange }) => {
  const theme = useTheme();

  const initHour24 = value.getHours();
  const initHour12 = initHour24 % 12 || 12;
  const initMinute = value.getMinutes();
  const initIsAM = initHour24 < 12;

  const [hourText, setHourText] = useState<string>(pad2(initHour12));
  const [minuteText, setMinuteText] = useState<string>(pad2(initMinute));
  const [isAM, setIsAM] = useState<boolean>(initIsAM);

  useEffect(() => {
    const h24 = value.getHours();
    const h12 = h24 % 12 || 12;
    setHourText(pad2(h12));
    setMinuteText(pad2(value.getMinutes()));
    setIsAM(h24 < 12);
  }, [value]);

  const updateDate = (h12: number, minute: number, am: boolean) => {
    let h24 = h12 % 12;
    if (!am) h24 += 12;
    const d = new Date(value);
    d.setHours(h24, minute);
    onChange(d);
  };

  const commitHour = (txt: string) => {
    const n = parseInt(txt, 10);
    if (Number.isNaN(n)) {
      const h24 = value.getHours();
      const h12 = h24 % 12 || 12;
      setHourText(pad2(h12));
      return;
    }
    const raw = n === 0 ? 12 : n;
    const h = clamp(raw, 1, 12);
    const minute = value.getMinutes();
    updateDate(h, minute, isAM);
    setHourText(pad2(h));
  };

  const commitMinute = (txt: string) => {
    const n = parseInt(txt, 10);
    if (Number.isNaN(n)) {
      setMinuteText(pad2(value.getMinutes()));
      return;
    }
    const m = clamp(n, 0, 59);
    const h24 = value.getHours();
    const h12 = h24 % 12 || 12;
    updateDate(h12, m, isAM);
    setMinuteText(pad2(m));
  };

  const toggleAm = () => {
    if (!isAM) {
      setIsAM(true);
      const h24 = value.getHours();
      const h12 = h24 % 12 || 12;
      updateDate(h12, value.getMinutes(), true);
    }
  };

  const togglePm = () => {
    if (isAM) {
      setIsAM(false);
      const h24 = value.getHours();
      const h12 = h24 % 12 || 12;
      updateDate(h12, value.getMinutes(), false);
    }
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
        <View style={{ marginLeft: 8, gap: 6 }}>
          <Pressable onPress={toggleAm}>
            <Text
              style={[
                styles.ampm,
                { color: theme.text },
                isAM ? styles.ampmActive : null,
              ]}
            >
              AM
            </Text>
          </Pressable>
          <Pressable onPress={togglePm}>
            <Text
              style={[
                styles.ampm,
                { color: theme.text },
                !isAM ? styles.ampmActive : null,
              ]}
            >
              PM
            </Text>
          </Pressable>
        </View>
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
  ampm: {
    fontSize: 16,
    fontWeight: "400",
  },
  ampmActive: {
    fontWeight: "700",
  },
});
