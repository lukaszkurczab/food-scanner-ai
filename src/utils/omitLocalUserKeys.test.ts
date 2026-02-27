import { describe, expect, it } from "@jest/globals";
import { omitLocalUserKeys } from "@/utils/omitLocalUserKeys";

describe("omitLocalUserKeys", () => {
  it("removes local-only keys and keeps business fields", () => {
    const input = {
      id: "local-id",
      created_at: "2026-01-01",
      _status: "created",
      _changed: "name",
      _raw: { table: "users" },
      name: "Alice",
      age: 30,
    };

    expect(omitLocalUserKeys(input)).toEqual({
      name: "Alice",
      age: 30,
    });
  });

  it("does not mutate original object", () => {
    const input = {
      id: "x",
      name: "Bob",
    };

    const output = omitLocalUserKeys(input);

    expect(output).toEqual({ name: "Bob" });
    expect(input).toEqual({ id: "x", name: "Bob" });
  });
});
