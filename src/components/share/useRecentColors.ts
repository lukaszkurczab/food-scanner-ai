import { useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "share.recentColors";

export function useRecentColors(baseQuickColors: string[]) {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setRecent(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  const uniqueQuickColors = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const c of [
      ...baseQuickColors.map((x) => x.toUpperCase()),
      ...recent.map((x) => x.toUpperCase()),
    ]) {
      if (!seen.has(c)) {
        seen.add(c);
        out.push(c);
      }
    }
    return out;
  }, [baseQuickColors, recent]);

  const addRecentColor = async (hex: string) => {
    const HEX = hex.toUpperCase();
    if (baseQuickColors.map((x) => x.toUpperCase()).includes(HEX)) return;
    const next = [HEX, ...recent.filter((x) => x.toUpperCase() !== HEX)].slice(
      0,
      8
    );
    setRecent(next);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  };

  return { recent, uniqueQuickColors, addRecentColor, setRecent } as const;
}
