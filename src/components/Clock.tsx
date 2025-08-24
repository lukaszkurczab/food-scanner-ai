// components/Clock.tsx
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { useTheme } from "@/theme/useTheme";
import { PrimaryButton, SecondaryButton, Card } from "@/components";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  onDone: () => void;
  onBack?: () => void;
  onCancel?: () => void;
  is24Hour?: boolean;
};

export const Clock: React.FC<Props> = ({
  value,
  onChange,
  onDone,
  onBack,
  onCancel,
  is24Hour = true,
}) => {
  const theme = useTheme();
  const [edit, setEdit] = useState(false);
  const [phase, setPhase] = useState<"hour" | "minute">("hour");
  const [size, setSize] = useState(260);
  const [hh, setHh] = useState(String(value.getHours()).padStart(2, "0"));
  const [mm, setMm] = useState(String(value.getMinutes()).padStart(2, "0"));

  const timeText = useMemo(
    () =>
      `${String(value.getHours()).padStart(2, "0")}:${String(
        value.getMinutes()
      ).padStart(2, "0")}`,
    [value]
  );

  const commit = (h: number, m: number) => {
    const d = new Date(value);
    d.setHours(h, m, 0, 0);
    onChange(d);
    setHh(String(h).padStart(2, "0"));
    setMm(String(m).padStart(2, "0"));
  };

  const applyManual = () => {
    let h = parseInt(hh.replace(/\D/g, ""), 10);
    let m = parseInt(mm.replace(/\D/g, ""), 10);
    if (Number.isNaN(h)) h = value.getHours();
    if (Number.isNaN(m)) m = value.getMinutes();
    if (!is24Hour) h = ((h % 12) + 12) % 12;
    h = Math.min(Math.max(h, 0), 23);
    m = Math.min(Math.max(m, 0), 59);
    commit(h, m);
    setEdit(false);
  };

  const r = size / 2;
  const outerR = r * 0.82;
  const innerR = r * 0.52;
  const handLen = phase === "hour" ? r * 0.5 : r * 0.75;

  const handlePolarPick = (x: number, y: number) => {
    const dx = x - r;
    const dy = y - r;
    const dist = Math.hypot(dx, dy);
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
    const fromTop = (deg + 90) % 360;

    if (phase === "hour") {
      const base = Math.round(fromTop / 30) % 12;
      const isOuter = dist >= (innerR + outerR) / 2;
      const hour = isOuter ? base : (base + 12) % 24;
      commit(hour, value.getMinutes());
      setPhase("minute");
    } else {
      const raw = Math.round(fromTop / 6) % 60;
      const minute = (Math.round(raw / 5) * 5) % 60;
      commit(value.getHours(), minute);
    }
  };

  const hourHandAngle = (value.getHours() % 12) * 30 - 90;
  const minuteHandAngle = value.getMinutes() * 6 - 90;

  return (
    <Card variant="outlined">
      <View style={{ alignItems: "center", gap: theme.spacing.md }}>
        <Pressable onPress={() => setEdit((v) => !v)}>
          {!edit ? (
            <Text
              style={{
                fontSize: 48,
                fontWeight: "800",
                color: theme.text,
                letterSpacing: 1,
              }}
            >
              {timeText}
            </Text>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                value={hh}
                onChangeText={setHh}
                keyboardType="number-pad"
                maxLength={2}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border },
                ]}
              />
              <Text
                style={{ fontSize: 32, color: theme.text, marginHorizontal: 6 }}
              >
                :
              </Text>
              <TextInput
                value={mm}
                onChangeText={setMm}
                keyboardType="number-pad"
                maxLength={2}
                style={[
                  styles.input,
                  { color: theme.text, borderColor: theme.border },
                ]}
              />
            </View>
          )}
        </Pressable>

        {!edit && (
          <>
            <View
              onLayout={(e) =>
                setSize(Math.min(300, Math.floor(e.nativeEvent.layout.width)))
              }
              style={{ width: "100%", alignItems: "center" }}
            >
              <View
                style={[
                  styles.dial,
                  {
                    width: size,
                    height: size,
                    borderRadius: r,
                    backgroundColor: theme.card,
                    borderColor: theme.border,
                  },
                ]}
                onStartShouldSetResponder={() => true}
                onResponderMove={(e) => {
                  const { locationX, locationY } = e.nativeEvent;
                  handlePolarPick(locationX, locationY);
                }}
                onResponderRelease={(e) => {
                  const { locationX, locationY } = e.nativeEvent;
                  handlePolarPick(locationX, locationY);
                }}
              >
                <View
                  style={[
                    styles.ring,
                    {
                      width: innerR * 2,
                      height: innerR * 2,
                      borderRadius: innerR,
                      borderColor: theme.border,
                    },
                  ]}
                />

                {Array.from({ length: 12 }).map((_, i) => {
                  const angle = (i * 30 - 90) * (Math.PI / 180);
                  const ox = r + outerR * Math.cos(angle);
                  const oy = r + outerR * Math.sin(angle);
                  const ix = r + innerR * Math.cos(angle);
                  const iy = r + innerR * Math.sin(angle);
                  const outerLabel = String(i % 12).padStart(2, "0");
                  const innerLabel = String((i + 12) % 24).padStart(2, "0");
                  return (
                    <React.Fragment key={i}>
                      <View
                        style={[styles.tick, { left: ox - 14, top: oy - 14 }]}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "600",
                            color: theme.text,
                          }}
                        >
                          {outerLabel}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.tickSmall,
                          { left: ix - 12, top: iy - 12 },
                        ]}
                      >
                        <Text
                          style={{ fontSize: 11, color: theme.textSecondary }}
                        >
                          {innerLabel}
                        </Text>
                      </View>
                    </React.Fragment>
                  );
                })}

                <View
                  style={[
                    styles.centerDot,
                    { backgroundColor: theme.card, borderColor: theme.link },
                  ]}
                />

                <View
                  style={[
                    styles.hand,
                    {
                      backgroundColor: theme.link,
                      transform: [
                        { translateX: r - 1 },
                        { translateY: r },
                        {
                          rotate: `${
                            phase === "hour" ? hourHandAngle : minuteHandAngle
                          }deg`,
                        },
                        { translateY: -handLen },
                      ],
                      height: handLen,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.knob,
                    {
                      transform: [
                        {
                          translateX:
                            r +
                            Math.cos(
                              ((phase === "hour"
                                ? hourHandAngle
                                : minuteHandAngle) +
                                90) *
                                (Math.PI / 180)
                            ) *
                              handLen -
                            10,
                        },
                        {
                          translateY:
                            r +
                            Math.sin(
                              ((phase === "hour"
                                ? hourHandAngle
                                : minuteHandAngle) +
                                90) *
                                (Math.PI / 180)
                            ) *
                              handLen -
                            10,
                        },
                      ],
                      borderColor: theme.link,
                      backgroundColor: theme.card,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
              <SecondaryButton
                label={phase === "hour" ? "Minuty" : "Godziny"}
                onPress={() =>
                  setPhase((p) => (p === "hour" ? "minute" : "hour"))
                }
              />
              {onBack ? (
                <SecondaryButton label="Wstecz" onPress={onBack} />
              ) : null}
              {onCancel ? (
                <SecondaryButton label="Anuluj" onPress={onCancel} />
              ) : null}
              <PrimaryButton label="Zapisz" onPress={onDone} />
            </View>
          </>
        )}

        {edit && (
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <SecondaryButton label="Anuluj" onPress={() => setEdit(false)} />
            <PrimaryButton label="OK" onPress={applyManual} />
          </View>
        )}
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  input: {
    width: 60,
    height: 52,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 26,
  },
  dial: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  ring: { position: "absolute", borderWidth: 1 },
  tick: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  tickSmall: {
    position: "absolute",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  centerDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  hand: { position: "absolute", width: 2 },
  knob: {
    position: "absolute",
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
});
