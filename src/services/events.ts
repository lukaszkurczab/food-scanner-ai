type Handler = (p?: unknown) => void;
const map = new Map<string, Set<Handler>>();
export function on<T = unknown>(ev: string, h: (p?: T) => void) {
  const handler = h as Handler;
  if (!map.has(ev)) map.set(ev, new Set());
  map.get(ev)!.add(handler);
  return () => map.get(ev)!.delete(handler);
}
export const emit = <T = unknown>(ev: string, p?: T) =>
  map.get(ev)?.forEach((h) => h(p));
