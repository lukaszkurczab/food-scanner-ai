import { emit } from "@/services/core/events";
import { markDeletedLocal } from "@/services/offline/meals.repo";
import { enqueueDelete } from "@/services/offline/queue.repo";

export type DeleteMealTransactionInput = {
  uid: string;
  cloudId: string;
  nowISO?: string;
};

export type DeleteMealTransactionResult = {
  deletedAt: string;
};

export async function deleteMealTransaction(
  input: DeleteMealTransactionInput,
): Promise<DeleteMealTransactionResult | null> {
  if (!input.uid || !input.cloudId) return null;

  const deletedAt = input.nowISO ?? new Date().toISOString();

  await markDeletedLocal(input.uid, input.cloudId, deletedAt);
  await enqueueDelete(input.uid, input.cloudId, deletedAt);
  emit("meal:delete:committed", {
    uid: input.uid,
    cloudId: input.cloudId,
    ts: deletedAt,
  });

  return { deletedAt };
}
