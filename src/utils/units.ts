export const cmToFtIn = (cm: number) => {
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn - ft * 12;
  return { ft, inch };
};
export const ftInToCm = (ft: number, inch: number) =>
  Math.round((ft * 12 + inch) * 2.54);

export const kgToLbs = (kg: number) => Math.round(kg * 2.20462);
export const lbsToKg = (lbs: number) => Math.round(lbs / 2.20462);
