const ON = typeof __DEV__ !== "undefined" && __DEV__;

export function debugScope(scope: string) {
  const p = `[${scope}]`;
  return {
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
}
