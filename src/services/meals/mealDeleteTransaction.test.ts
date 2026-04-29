import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { deleteMealTransaction } from "@/services/meals/mealDeleteTransaction";

const mockMarkDeletedLocal = jest.fn<
  (uid: string, cloudId: string, updatedAt: string) => Promise<void>
>();
const mockEnqueueDelete = jest.fn<
  (uid: string, cloudId: string, updatedAt: string) => Promise<void>
>();
const mockEmit = jest.fn<(event: string, payload: Record<string, unknown>) => void>();

jest.mock("@/services/offline/meals.repo", () => ({
  markDeletedLocal: (uid: string, cloudId: string, updatedAt: string) =>
    mockMarkDeletedLocal(uid, cloudId, updatedAt),
}));

jest.mock("@/services/offline/queue.repo", () => ({
  enqueueDelete: (uid: string, cloudId: string, updatedAt: string) =>
    mockEnqueueDelete(uid, cloudId, updatedAt),
}));

jest.mock("@/services/core/events", () => ({
  emit: (event: string, payload: Record<string, unknown>) =>
    mockEmit(event, payload),
}));

describe("deleteMealTransaction", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMarkDeletedLocal.mockResolvedValue();
    mockEnqueueDelete.mockResolvedValue();
  });

  it("marks the meal deleted locally before enqueueing one delete", async () => {
    const result = await deleteMealTransaction({
      uid: "user-1",
      cloudId: "cloud-1",
      nowISO: "2026-04-28T08:00:00.000Z",
    });

    expect(result).toEqual({ deletedAt: "2026-04-28T08:00:00.000Z" });
    expect(mockMarkDeletedLocal).toHaveBeenCalledTimes(1);
    expect(mockMarkDeletedLocal).toHaveBeenCalledWith(
      "user-1",
      "cloud-1",
      "2026-04-28T08:00:00.000Z",
    );
    expect(mockEnqueueDelete).toHaveBeenCalledTimes(1);
    expect(mockEnqueueDelete).toHaveBeenCalledWith(
      "user-1",
      "cloud-1",
      "2026-04-28T08:00:00.000Z",
    );
    expect(mockMarkDeletedLocal.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnqueueDelete.mock.invocationCallOrder[0],
    );
    expect(mockEmit).toHaveBeenCalledWith("meal:delete:committed", {
      uid: "user-1",
      cloudId: "cloud-1",
      ts: "2026-04-28T08:00:00.000Z",
    });
    expect(mockEmit).not.toHaveBeenCalledWith(
      "meal:deleted",
      expect.anything(),
    );
  });

  it("skips empty identifiers", async () => {
    await expect(
      deleteMealTransaction({ uid: "user-1", cloudId: "" }),
    ).resolves.toBeNull();

    expect(mockMarkDeletedLocal).not.toHaveBeenCalled();
    expect(mockEnqueueDelete).not.toHaveBeenCalled();
    expect(mockEmit).not.toHaveBeenCalled();
  });
});
