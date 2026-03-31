import { formatDistanceToNowStrict } from "date-fns/formatDistanceToNowStrict";
import { enUS, pl } from "date-fns/locale";

function resolveLocale(language?: string) {
  return language?.toLowerCase().startsWith("pl") ? pl : enUS;
}

export function formatMealRelativeTime(
  value: string | null | undefined,
  language?: string,
): string | null {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDistanceToNowStrict(parsed, {
    addSuffix: true,
    locale: resolveLocale(language),
  });
}
