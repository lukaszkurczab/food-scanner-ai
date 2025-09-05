import type { ShareFilter } from "@/types/share";

const ORDER: ShareFilter[] = ["none", "bw", "sepia", "cool", "warm"];

export function cycleFilter(
  current: ShareFilter,
  dir: "left" | "right"
): ShareFilter {
  const i = ORDER.indexOf(current);
  if (i < 0) return "none";
  const next =
    dir === "right"
      ? (i + 1) % ORDER.length
      : (i - 1 + ORDER.length) % ORDER.length;
  return ORDER[next];
}

export function getFilterOverlay(filter: ShareFilter): {
  overlayStyle?: { backgroundColor: string };
  borderStyle?: { borderColor?: string; borderWidth?: number };
} {
  switch (filter) {
    case "bw":
      return { overlayStyle: { backgroundColor: "rgba(0,0,0,0.28)" } };
    case "sepia":
      return { overlayStyle: { backgroundColor: "rgba(112,66,20,0.22)" } };
    case "cool":
      return { overlayStyle: { backgroundColor: "rgba(40,120,255,0.18)" } };
    case "warm":
      return { overlayStyle: { backgroundColor: "rgba(255,140,0,0.18)" } };
    default:
      return {};
  }
}
