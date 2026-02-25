type SanitizeNumericInputOptions = {
  maxDecimals?: number;
};

type NormalizeNumericInputOptions = SanitizeNumericInputOptions & {
  fallback?: string;
};

export const sanitizeNumericInput = (
  rawValue: string,
  options: SanitizeNumericInputOptions = {}
) => {
  const { maxDecimals } = options;

  if (!rawValue) return "";

  const normalized = String(rawValue).replace(/,/g, ".");
  let cleaned = normalized.replace(/[^0-9.]/g, "");

  if (!cleaned) return "";

  const firstDot = cleaned.indexOf(".");
  if (firstDot !== -1) {
    cleaned =
      cleaned.slice(0, firstDot + 1) +
      cleaned.slice(firstDot + 1).replace(/\./g, "");
  }

  const hasDot = cleaned.includes(".");
  let [intPart, decimalPart = ""] = cleaned.split(".");

  if (hasDot && intPart.length === 0) {
    intPart = "0";
  }

  if (intPart.length > 1) {
    intPart = intPart.replace(/^0+/, "");
    if (intPart.length === 0) intPart = "0";
  }

  if (typeof maxDecimals === "number" && maxDecimals >= 0) {
    decimalPart = decimalPart.slice(0, maxDecimals);
  }

  if (!hasDot || maxDecimals === 0) {
    return intPart;
  }

  return decimalPart.length > 0 ? `${intPart}.${decimalPart}` : `${intPart}.`;
};

export const normalizeNumericInputOnBlur = (
  rawValue: string,
  options: NormalizeNumericInputOptions = {}
) => {
  const { fallback = "0", maxDecimals } = options;
  const sanitized = sanitizeNumericInput(rawValue, { maxDecimals });

  if (!sanitized) return fallback;

  if (sanitized.endsWith(".")) {
    const withoutDot = sanitized.slice(0, -1);
    return withoutDot || fallback;
  }

  return sanitized;
};
