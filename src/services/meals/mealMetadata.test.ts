import { describe, expect, it } from "@jest/globals";
import {
  getMealAiMetaFromAiResponse,
  normalizeMealAiMeta,
  normalizeMealInputMethod,
  parseMealAiMeta,
  serializeMealAiMeta,
} from "@/services/meals/mealMetadata";

describe("mealMetadata", () => {
  it("normalizes the canonical meal input methods", () => {
    expect(normalizeMealInputMethod("photo")).toBe("photo");
    expect(normalizeMealInputMethod("saved")).toBe("saved");
    expect(normalizeMealInputMethod("legacy")).toBeNull();
  });

  it("serializes and hydrates aiMeta safely", () => {
    const raw = serializeMealAiMeta({
      model: "gpt-5.4-mini",
      runId: "run-1",
      confidence: 0.92,
      warnings: ["low_confidence_ingredient"],
    });

    expect(raw).toBe(
      JSON.stringify({
        model: "gpt-5.4-mini",
        runId: "run-1",
        confidence: 0.92,
        warnings: ["low_confidence_ingredient"],
      }),
    );
    expect(parseMealAiMeta(raw)).toEqual({
      model: "gpt-5.4-mini",
      runId: "run-1",
      confidence: 0.92,
      warnings: ["low_confidence_ingredient"],
    });
  });

  it("returns null for malformed or empty aiMeta payloads", () => {
    expect(parseMealAiMeta("{bad-json")).toBeNull();
    expect(normalizeMealAiMeta({ foo: "bar" })).toBeNull();
    expect(serializeMealAiMeta(null)).toBeNull();
  });

  it("extracts aiMeta from AI responses only when supported fields exist", () => {
    expect(
      getMealAiMetaFromAiResponse({
        model: "gpt-5.4",
        runId: "run-2",
        confidence: 0.7,
        warnings: ["partial_totals"],
      }),
    ).toEqual({
      model: "gpt-5.4",
      runId: "run-2",
      confidence: 0.7,
      warnings: ["partial_totals"],
    });
    expect(
      getMealAiMetaFromAiResponse({
        version: "2026-03-01",
      }),
    ).toBeNull();
  });
});
