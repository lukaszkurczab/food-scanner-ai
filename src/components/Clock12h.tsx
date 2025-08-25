import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  GestureResponderEvent,
  TextInput,
} from "react-native";
import { useTheme } from "@/theme/useTheme";

type Props = {
  value: Date;
  onChange: (d: Date) => void;
  onDone: () => void;
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const clamp = (n: number, a: number, b: number) => Math.min(Math.max(n, a), b);

export const Clock24h: React.FC<Props> = ({ value }) => {
  const theme = useTheme();

  const size = 280;
  const radius = size / 2;
  const labelRadius = radius * 0.85;

  const initHour = value.getHours() % 12 || 12;
  const initMinute = value.getMinutes();

  const [phase, setPhase] = useState<"hour" | "minute">("hour");
  const [selectedHour, setSelectedHour] = useState<number>(initHour);
  const [selectedMinute, setSelectedMinute] = useState<number>(initMinute);
  const [handAngleDeg, setHandAngleDeg] = useState<number>(initHour * 30);
  const [markerPos, setMarkerPos] = useState<{ x: number; y: number }>(() => {
    const ang = (initHour * 30 - 90) * (Math.PI / 180);
    return {
      x: radius + labelRadius * Math.cos(ang),
      y: radius + labelRadius * Math.sin(ang),
    };
  });

  const [hourText, setHourText] = useState<string>(
    pad2(initHour === 12 ? 12 : initHour)
  );
  const [minuteText, setMinuteText] = useState<string>(pad2(initMinute));

  const hourToCoord = (h: number) => {
    const ang = (h * 30 - 90) * (Math.PI / 180);
    return {
      x: radius + labelRadius * Math.cos(ang),
      y: radius + labelRadius * Math.sin(ang),
    };
  };

  const commitHour = (txt: string) => {
    const n = parseInt(txt.replace(/\D/g, ""), 10);
    if (Number.isNaN(n)) {
      setHourText(pad2(selectedHour === 12 ? 12 : selectedHour));
      return;
    }
    const hClamp = clamp(n, 0, 12);
    const ring = hClamp === 0 ? 12 : hClamp;
    setSelectedHour(ring);
    setHandAngleDeg(ring * 30);
    const { x, y } = hourToCoord(ring);
    setMarkerPos({ x, y });
    setHourText(pad2(hClamp));
    setPhase("hour");
  };

  const commitMinute = (txt: string) => {
    const n = parseInt(txt.replace(/\D/g, ""), 10);
    if (Number.isNaN(n)) {
      setMinuteText(pad2(selectedMinute));
      return;
    }
    const mm = clamp(n, 0, 59);
    setSelectedMinute(mm);
    setHandAngleDeg(mm * 6);
    setMinuteText(pad2(mm));
    setPhase("minute");
  };

  const setHourFromDial = (h: number) => {
    const h12 = ((h - 1 + 12) % 12) + 1;
    setSelectedHour(h12);
    setHandAngleDeg(h12 * 30);
    const { x, y } = hourToCoord(h12);
    setMarkerPos({ x, y });
    setHourText(pad2(h12 === 12 ? 12 : h12));
  };

  const setMinuteFromDial = (m: number) => {
    const mm = ((m % 60) + 60) % 60;
    setSelectedMinute(mm);
    setHandAngleDeg(mm * 6);
    setMinuteText(pad2(mm));
  };

  const handleClockTouch = (x: number, y: number) => {
    const dx = x - radius;
    const dy = y - radius;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    deg = (deg + 450) % 360;
    if (phase === "hour") {
      const h = Math.round(deg / 30) % 12 || 12;
      setHourFromDial(h);
    } else {
      const m = Math.round(deg / 6) % 60;
      setMinuteFromDial(m);
    }
  };

  const onOverlayGrant = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    handleClockTouch(locationX, locationY);
  };
  const onOverlayMove = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    handleClockTouch(locationX, locationY);
  };
  const onOverlayRelease = () => {
    if (phase === "hour") {
      setPhase("minute");
      setHandAngleDeg(selectedMinute * 6);
    } else {
      setPhase("hour");
      setHandAngleDeg(selectedHour * 30);
      const { x, y } = hourToCoord(selectedHour);
      setMarkerPos({ x, y });
    }
  };

  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={hourText}
          onChangeText={(t) => setHourText(t.replace(/[^\d]/g, "").slice(0, 2))}
          onFocus={() => {
            setPhase("hour");
            setHandAngleDeg(selectedHour * 30);
          }}
          onBlur={() => commitHour(hourText)}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.input, { color: theme.text }]}
        />
        <Text style={{ fontSize: 32, fontWeight: "700", color: theme.text }}>
          :
        </Text>
        <TextInput
          value={minuteText}
          onChangeText={(t) =>
            setMinuteText(t.replace(/[^\d]/g, "").slice(0, 2))
          }
          onFocus={() => {
            setPhase("minute");
            setHandAngleDeg(selectedMinute * 6);
          }}
          onBlur={() => commitMinute(minuteText)}
          keyboardType="number-pad"
          maxLength={2}
          style={[styles.input, { color: theme.text }]}
        />
      </View>

      <View
        style={[
          styles.dial,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: theme.card,
            borderColor: theme.border,
            position: "relative",
          },
        ]}
      >
        <View
          style={StyleSheet.absoluteFillObject}
          pointerEvents="auto"
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderGrant={onOverlayGrant}
          onResponderMove={onOverlayMove}
          onResponderRelease={onOverlayRelease}
        />

        {phase === "hour"
          ? Array.from({ length: 12 }).map((_, i) => {
              const hour = i + 1;
              const ang = (hour * 30 - 90) * (Math.PI / 180);
              const x = radius + labelRadius * Math.cos(ang);
              const y = radius + labelRadius * Math.sin(ang);
              return (
                <View
                  key={`h-${i}`}
                  style={[styles.tick, { left: x - 14, top: y - 14 }]}
                  pointerEvents="none"
                >
                  <Text style={{ fontSize: 18, color: theme.text }}>
                    {hour}
                  </Text>
                </View>
              );
            })
          : null}

        {phase === "minute"
          ? Array.from({ length: 12 }).map((_, k) => {
              const m = (k + 1) * 5;
              const label = m === 60 ? 60 : m;
              const ang = (m * 6 - 90) * (Math.PI / 180);
              const x = radius + labelRadius * Math.cos(ang);
              const y = radius + labelRadius * Math.sin(ang);
              return (
                <View
                  key={`m-lab-${k}`}
                  style={[styles.tick, { left: x - 14, top: y - 14 }]}
                  pointerEvents="none"
                >
                  <Text style={{ fontSize: 16, color: theme.text }}>
                    {label}
                  </Text>
                </View>
              );
            })
          : null}

        {phase === "hour" ? (
          <View
            style={[
              styles.center,
              {
                borderColor: theme.link,
                left: markerPos.x - 16,
                top: markerPos.y - 16,
              },
            ]}
            pointerEvents="none"
          />
        ) : null}

        <View
          style={[
            styles.hand,
            {
              left: radius,
              height: 208,
              transform: [{ translateX: -1 }, { rotate: `${handAngleDeg}deg` }],
            },
          ]}
          pointerEvents="none"
        >
          <View style={[styles.handHalf, { backgroundColor: theme.link }]} />
          <View style={[styles.handHalf, { backgroundColor: "transparent" }]} />
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
  },
  dial: {
    position: "relative",
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  tick: {
    position: "absolute",
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  hand: {
    position: "absolute",
    width: 2,
    flexDirection: "column",
  },
  handHalf: {
    flex: 1,
  },
});
