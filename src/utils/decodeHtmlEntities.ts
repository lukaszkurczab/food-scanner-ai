// Minimal HTML entity decoder for product names and API strings.
// Covers common named entities and numeric (decimal/hex) entities.

const named: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeHtmlEntities(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    // Numeric decimal entities &#34;
    .replace(/&#(\d+);?/g, (_, dec: string) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    // Numeric hex entities &#x22;
    .replace(/&#x([0-9a-fA-F]+);?/g, (_, hex: string) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    // Named entities &quot;
    .replace(/&([a-zA-Z]+);/g, (m: string, name: string) => {
      const n = name.toLowerCase();
      return Object.prototype.hasOwnProperty.call(named, n) ? named[n] : m;
    });
}

export default decodeHtmlEntities;

