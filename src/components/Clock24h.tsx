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
  const outerRadius = radius * 0.85;
  const innerRadius = radius * 0.56;
  const minuteLen = radius * 1.4;

  const initHour24 = value.getHours();
  const initMinute = value.getMinutes();

  const [phase, setPhase] = useState<"hour" | "minute">("hour");
  const [selectedHour24, setSelectedHour24] = useState<number>(initHour24);
  const [selectedMinute, setSelectedMinute] = useState<number>(initMinute);
  const [outerStart, setOuterStart] = useState<number>(
    initHour24 < 12 ? 0 : 12
  );
  const [handAngleDeg, setHandAngleDeg] = useState<number>(
    (initHour24 % 12) * 30
  );
  const [handLen, setHandLen] = useState<number>(outerRadius);
  const [markerPos, setMarkerPos] = useState<{ x: number; y: number }>(() => {
    const ang = ((initHour24 % 12) * 30 - 90) * (Math.PI / 180);
    const r = outerRadius;
    return {
      x: radius + r * Math.cos(ang),
      y: radius + r * Math.sin(ang),
    };
  });

  const [hourText, setHourText] = useState<string>(pad2(initHour24));
  const [minuteText, setMinuteText] = useState<string>(pad2(initMinute));

  const hourToCoord24Outer = (h24: number) => {
    const ang = ((h24 % 12) * 30 - 90) * (Math.PI / 180);
    const r = outerRadius;
    return { x: radius + r * Math.cos(ang), y: radius + r * Math.sin(ang), r };
  };

  const setHour24 = (h24: number) => {
    const hh = ((h24 % 24) + 24) % 24;
    setSelectedHour24(hh);
    setOuterStart(hh < 12 ? 0 : 12);
    setHandAngleDeg((hh % 12) * 30);
    const { x, y, r } = hourToCoord24Outer(hh);
    setMarkerPos({ x, y });
    setHandLen(r);
    setHourText(pad2(hh));
  };

  const setMinute = (m: number) => {
    const mm = ((m % 60) + 60) % 60;
    setSelectedMinute(mm);
    setHandAngleDeg(mm * 6);
    setHandLen(minuteLen);
    setMinuteText(pad2(mm));
  };

  const commitHour = (txt: string) => {
    const n = parseInt(txt.replace(/\D/g, ""), 10);
    if (Number.isNaN(n)) {
      setHourText(pad2(selectedHour24));
      return;
    }
    const h = clamp(n, 0, 23);
    setHour24(h);
    setPhase("hour");
  };

  const commitMinute = (txt: string) => {
    const n = parseInt(txt.replace(/\D/g, ""), 10);
    if (Number.isNaN(n)) {
      setMinuteText(pad2(selectedMinute));
      return;
    }
    const mm = clamp(n, 0, 59);
    setMinute(mm);
    setPhase("minute");
  };

  const handleClockTouch = (x: number, y: number) => {
    const dx = x - radius;
    const dy = y - radius;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
    deg = (deg + 450) % 360;
    if (phase === "hour") {
      const idx = Math.round(deg / 30) % 12;
      const r = Math.hypot(dx, dy);
      const threshold = (innerRadius + outerRadius) / 2;
      const isOuterTap = r >= threshold;
      const base = isOuterTap ? outerStart : outerStart ^ 12;
      const h24 = (base + idx) % 24;
      setHour24(h24);
      setPhase("hour");
    } else {
      const m = Math.round(deg / 6) % 60;
      setMinute(m);
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
      setHandLen(minuteLen);
    } else {
      setPhase("hour");
      setHandAngleDeg((selectedHour24 % 12) * 30);
      const { x, y, r } = hourToCoord24Outer(selectedHour24);
      setMarkerPos({ x, y });
      setHandLen(r);
    }
  };

  const renderHourLabels = () => {
    const innerStart = outerStart ^ 12;
    return (
      <>
        {Array.from({ length: 12 }).map((_, i) => {
          const h = (outerStart + i) % 24;
          const ang = (i * 30 - 90) * (Math.PI / 180);
          const x = radius + outerRadius * Math.cos(ang);
          const y = radius + outerRadius * Math.sin(ang);
          return (
            <View
              key={`outer-${i}`}
              style={[styles.tick, { left: x - 14, top: y - 14 }]}
              pointerEvents="none"
            >
              <Text style={{ fontSize: 14, color: theme.text }}>{pad2(h)}</Text>
            </View>
          );
        })}
        {Array.from({ length: 12 }).map((_, i) => {
          const h = (innerStart + i) % 24;
          const ang = (i * 30 - 90) * (Math.PI / 180);
          const x = radius + innerRadius * Math.cos(ang);
          const y = radius + innerRadius * Math.sin(ang);
          return (
            <View
              key={`inner-${i}`}
              style={[styles.tick, { left: x - 12, top: y - 12 }]}
              pointerEvents="none"
            >
              <Text style={{ fontSize: 12, color: theme.text }}>{pad2(h)}</Text>
            </View>
          );
        })}
      </>
    );
  };

  return (
    <View style={{ alignItems: "center", gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <TextInput
          value={hourText}
          onChangeText={(t) => setHourText(t.replace(/[^\d]/g, "").slice(0, 2))}
          onFocus={() => {
            setPhase("hour");
            setHandAngleDeg((selectedHour24 % 12) * 30);
            const { x, y, r } = hourToCoord24Outer(selectedHour24);
            setMarkerPos({ x, y });
            setHandLen(r);
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
            setHandLen(minuteLen);
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

        {phase === "hour" ? renderHourLabels() : null}

        {phase === "minute"
          ? Array.from({ length: 12 }).map((_, k) => {
              const m = (k + 1) * 5;
              const label = m === 60 ? 60 : m;
              const ang = (m * 6 - 90) * (Math.PI / 180);
              const x = radius + outerRadius * Math.cos(ang);
              const y = radius + outerRadius * Math.sin(ang);
              return (
                <View
                  key={`m-lab-${k}`}
                  style={[styles.tick, { left: x - 14, top: y - 14 }]}
                  pointerEvents="none"
                >
                  <Text style={{ fontSize: 16, color: theme.text }}>
                    {pad2(label)}
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
              height: handLen,
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
