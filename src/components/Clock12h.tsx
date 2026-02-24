import React, { useState, useEffect, useMemo } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);
const INPUT_WIDTH = 64;

export const Clock12h: React.FC<Props> = ({ value, onChange }) => {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme.mode]);

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
    <View style={styles.container}>
      <View style={styles.timeRow}>
        <TextInput
          value={hourText}
          onChangeText={(t) => setHourText(t.replace(/[^\d]/g, "").slice(0, 2))}
          onBlur={() => commitHour(hourText)}
          keyboardType="number-pad"
          maxLength={2}
          style={styles.input}
        />
        <Text style={styles.separator}>:</Text>
        <TextInput
          value={minuteText}
          onChangeText={(t) =>
            setMinuteText(t.replace(/[^\d]/g, "").slice(0, 2))
          }
          onBlur={() => commitMinute(minuteText)}
          keyboardType="number-pad"
          maxLength={2}
          style={styles.input}
        />
        <View style={styles.periodColumn}>
          <Pressable onPress={toggleAm}>
            <Text
              style={[
                styles.ampm,
                isAM ? styles.ampmActive : null,
                !isAM ? styles.ampmInactive : null,
              ]}
            >
              AM
            </Text>
          </Pressable>
          <Pressable onPress={togglePm}>
            <Text
              style={[
                styles.ampm,
                !isAM ? styles.ampmActive : null,
                isAM ? styles.ampmInactive : null,
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
    periodColumn: {
      marginLeft: theme.spacing.sm,
      gap: theme.spacing.sm - 2,
    },
    ampm: {
      fontSize: theme.typography.size.base,
    },
    ampmActive: {
      color: theme.text,
      fontFamily: theme.typography.fontFamily.bold,
    },
    ampmInactive: {
      color: theme.textSecondary,
      fontFamily: theme.typography.fontFamily.regular,
    },
  });
