function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

export function findUndefinedPaths(obj: unknown, base = ""): string[] {
  const bad: string[] = [];
  const entries = isRecord(obj) ? Object.entries(obj) : [];
  entries.forEach(([k, v]) => {
    const p = base ? `${base}.${k}` : k;
    if (v === undefined) bad.push(p);
    else if (Array.isArray(v)) {
      v.forEach((it, i) => {
        if (it === undefined) bad.push(`${p}[${i}]`);
        else if (isRecord(it)) bad.push(...findUndefinedPaths(it, `${p}[${i}]`));
      });
    } else if (isRecord(v)) {
      bad.push(...findUndefinedPaths(v, p));
    }
  });
  return bad;
}

export function assertNoUndefined(obj: unknown, where: string) {
  const bad = findUndefinedPaths(obj);
  if (bad.length) {
    console.error(`❌ Undefined w ${where}:`, bad);
    throw new Error(`Undefined fields in ${where}: ${bad.join(", ")}`);
  }
}
