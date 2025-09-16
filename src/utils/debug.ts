const ON = typeof __DEV__ !== "undefined" && __DEV__;

export type DebugLogger = {
  log: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  time: (label: string) => void;
  timeEnd: (label: string) => void;
  child: (subscope: string) => DebugLogger;
};

export function debugScope(scope: string): DebugLogger {
  const p = `[${scope}]`;
  const base = {
    log: (...args: any[]) => {
      if (ON) console.log(p, ...args);
    },
    warn: (...args: any[]) => console.warn(p, ...args),
    error: (...args: any[]) => console.error(p, ...args),
    time: (label: string) => {
      if (ON) console.time(`${p} ${label}`);
    },
    timeEnd: (label: string) => {
      if (ON) console.timeEnd(`${p} ${label}`);
    },
  };
  return {
    ...base,
    child: (subscope: string) => debugScope(`${scope}:${subscope}`),
  };
}

export const Sync = debugScope("Sync");
