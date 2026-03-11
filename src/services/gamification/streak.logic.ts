export type StreakDoc = {
  current: number;
  lastDate: string | null;
};

export const INIT_STREAK: StreakDoc = { current: 0, lastDate: null };

const DAY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const formatStreakDate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

export const isSameStreakDay = (a: string | null, b: string): boolean =>
  !!a && a === b;

export const missedSinceStreakDay = (
  last: string | null,
  today: string,
): boolean => {
  if (!last) return true;
  const [y1, m1, d1] = last.split("-").map((n) => parseInt(n, 10));
  const [y2, m2, d2] = today.split("-").map((n) => parseInt(n, 10));
  const t1 = new Date(y1, m1 - 1, d1).getTime();
  const t2 = new Date(y2, m2 - 1, d2).getTime();
  const diffDays = Math.floor((t2 - t1) / 86400000);
  return diffDays >= 2;
};

export const hasReachedStreakThreshold = (params: {
  consumedKcal: number;
  targetKcal: number;
  thresholdPct: number;
}): boolean => {
  const { consumedKcal, targetKcal, thresholdPct } = params;
  if (targetKcal <= 0) return false;
  return consumedKcal / targetKcal >= thresholdPct;
};

type StreakDocCandidate = {
  current?: unknown;
  lastDate?: unknown;
};

export const sanitizeStreakDoc = (raw: unknown): StreakDoc | null => {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as StreakDocCandidate;
  const current =
    typeof candidate.current === "number" && candidate.current >= 0
      ? candidate.current
      : null;
  const lastDate =
    candidate.lastDate == null
      ? null
      : typeof candidate.lastDate === "string" && DAY_REGEX.test(candidate.lastDate)
        ? candidate.lastDate
        : undefined;
  if (current === null || lastDate === undefined) return null;
  return { current, lastDate };
};

