export function findUndefinedPaths(obj: any, base = ""): string[] {
  const bad: string[] = [];
  const isObj = (v: any) => v && typeof v === "object";
  Object.entries(obj ?? {}).forEach(([k, v]) => {
    const p = base ? `${base}.${k}` : k;
    if (v === undefined) bad.push(p);
    else if (Array.isArray(v)) {
      v.forEach((it, i) => {
        if (it === undefined) bad.push(`${p}[${i}]`);
        else if (isObj(it)) bad.push(...findUndefinedPaths(it, `${p}[${i}]`));
      });
    } else if (isObj(v)) {
      bad.push(...findUndefinedPaths(v, p));
    }
  });
  return bad;
}

export function assertNoUndefined(obj: any, where: string) {
  const bad = findUndefinedPaths(obj);
  if (bad.length) {
    console.error(`❌ Undefined w ${where}:`, bad);
    throw new Error(`Undefined fields in ${where}: ${bad.join(", ")}`);
  }
}
