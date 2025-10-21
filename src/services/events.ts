type Handler = (p?: any) => void;
const map = new Map<string, Set<Handler>>();
export function on(ev: string, h: Handler) {
  if (!map.has(ev)) map.set(ev, new Set());
  map.get(ev)!.add(h);
  return () => map.get(ev)!.delete(h);
}
export const emit = (ev: string, p?: any) => map.get(ev)?.forEach((h) => h(p));
