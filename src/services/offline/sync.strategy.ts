import type { QueuedOp } from "./queue.repo";

export type QueueOp = QueuedOp;

export interface SyncStrategy {
  /** Pull remote changes and persist locally. Returns count of items synced. */
  pull(uid: string): Promise<number>;

  /**
   * Process one op from the push queue.
   * Returns true if the op was handled by this strategy, false otherwise.
   */
  handlePushOp(uid: string, op: QueueOp): Promise<boolean>;
}
