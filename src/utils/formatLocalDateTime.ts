type FormatLocalDateTimeParams = {
  locale?: string;
  includeTime?: boolean;
};

export function formatLocalDateTime(
  value?: string | null,
  params: FormatLocalDateTimeParams = {},
): string | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const { locale, includeTime = true } = params;
  const formatter = new Intl.DateTimeFormat(locale || undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime
      ? {
          hour: "2-digit",
          minute: "2-digit",
        }
      : {}),
  });

  return formatter.format(parsed);
}
