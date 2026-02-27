import { describe, expect, it } from "@jest/globals";
import decodeHtmlEntities, { decodeHtmlEntities as decodeNamed } from "@/utils/decodeHtmlEntities";

describe("decodeHtmlEntities", () => {
  it("returns empty string for empty and non-string input", () => {
    expect(decodeNamed("")).toBe("");
    expect(decodeNamed(null as unknown as string)).toBe("");
  });

  it("decodes decimal and hexadecimal numeric entities", () => {
    expect(decodeNamed("A&#66;C")).toBe("ABC");
    expect(decodeNamed("&#x41;&#x42;")).toBe("AB");
  });

  it("decodes known named entities and keeps unknown entities", () => {
    expect(decodeNamed("&amp;&LT;&gt;&quot;&apos;&nbsp;")).toBe("&<>\"' ");
    expect(decodeNamed("hello &unknown; world")).toBe("hello &unknown; world");
  });

  it("supports default export alias", () => {
    expect(decodeHtmlEntities("&amp;")).toBe("&");
  });
});
