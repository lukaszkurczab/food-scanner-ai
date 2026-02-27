import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import {
  arr,
  asEnum,
  asEnumNullable,
  db,
  orUndef,
  todayLocal,
  usersCollection,
  USERS,
} from "@/services/user/common";
import { getApp } from "@react-native-firebase/app";
import { collection, getFirestore } from "@react-native-firebase/firestore";

jest.mock("@react-native-firebase/app", () => ({
  getApp: jest.fn(() => "APP"),
}));

jest.mock("@react-native-firebase/firestore", () => ({
  getFirestore: jest.fn(() => "DB"),
  collection: jest.fn(() => "USERS_COLLECTION"),
}));

describe("user common helpers", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 2, 10, 16, 30, 0, 0));
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("creates db and users collection references", () => {
    expect(db()).toBe("DB");
    expect(usersCollection()).toBe("USERS_COLLECTION");
    expect(USERS).toBe("users");
    expect(getApp).toHaveBeenCalled();
    expect(getFirestore).toHaveBeenCalled();
    expect(collection).toHaveBeenCalledWith("DB", "users");
  });

  it("normalizes optional values and arrays", () => {
    expect(orUndef("x")).toBe("x");
    expect(orUndef(null)).toBeUndefined();
    expect(arr([1, 2])).toEqual([1, 2]);
    expect(arr(null)).toEqual([]);
  });

  it("parses enums and nullable enums with fallbacks", () => {
    expect(asEnum("a", ["a", "b"] as const, "b")).toBe("a");
    expect(asEnum("x", ["a", "b"] as const, "b")).toBe("b");

    expect(asEnumNullable("a", ["a", "b"] as const, "b")).toBe("a");
    expect(asEnumNullable("x", ["a", "b"] as const, "b")).toBe("b");
    expect(asEnumNullable(null, ["a", "b"] as const)).toBeNull();
  });

  it("formats local date string as yyyy-mm-dd", () => {
    expect(todayLocal()).toBe("2026-03-10");
  });
});
