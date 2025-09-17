export function parseColor(input: string): string | null {
  const str = input.trim();
  const hexMatch = str.match(/^#?([0-9a-fA-F]{6})$/);
  if (hexMatch) return `#${hexMatch[1].toUpperCase()}`;
  const rgbCall = str.match(
    /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i
  );
  const rgbFlat = str.match(/^(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})$/);
  const m = rgbCall || rgbFlat;
  if (m) {
    const to255 = (v: string) => Math.max(0, Math.min(255, parseInt(v, 10)));
    const r = to255(m[1]);
    const g = to255(m[2]);
    const b = to255(m[3]);
    const to2 = (v: number) => v.toString(16).padStart(2, "0");
    return `#${to2(r)}${to2(g)}${to2(b)}`.toUpperCase();
  }
  return null;
}
