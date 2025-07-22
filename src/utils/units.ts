export const convertHeight = (
  dir: "cmToImperial" | "imperialToCm",
  a: number,
  b?: number
) => {
  if (dir === "cmToImperial") {
    const totalInches = a / 2.54;
    const ft = Math.floor(totalInches / 12);
    const inch = Math.round(totalInches - ft * 12);
    return { ft, inch };
  } else {
    const cm = Math.round(((a ?? 0) * 12 + (b ?? 0)) * 2.54);
    return cm;
  }
};

export const convertWeight = (dir: "kgToLbs" | "lbsToKg", val: number) => {
  return dir === "kgToLbs"
    ? Math.round(val * 2.20462)
    : Math.round(val / 2.20462);
};
