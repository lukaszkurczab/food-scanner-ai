export const fmtKcal = (v: number) => `${Math.round(v)} kcal`;
export const fmtG = (v: number) => `${Math.round(v)} g`;
export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
