import NetInfo from "@react-native-community/netinfo";

export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    retries = 3,
    baseMs = 600,
    maxMs = 30_000,
  }: { retries?: number; baseMs?: number; maxMs?: number } = {}
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (i === retries) break;
      const wait = Math.min(maxMs, baseMs * Math.pow(2, i));
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export function onReconnect(action: () => void) {
  NetInfo.fetch().then((s) => {
    if (s.isConnected) action();
  });
  const unsub = NetInfo.addEventListener((s) => {
    if (s.isConnected) action();
  });
  return unsub;
}

export async function isOnline(): Promise<boolean> {
  const s = await NetInfo.fetch();
  return !!s.isConnected;
}

export async function onceOnline(): Promise<void> {
  const s = await NetInfo.fetch();
  if (s.isConnected) return;
  await new Promise<void>((resolve) => {
    const unsub = NetInfo.addEventListener((st) => {
      if (st.isConnected) {
        unsub();
        resolve();
      }
    });
  });
}

export function lastWriteWins(
  localTs?: string | number | null,
  remoteTs?: string | number | null
): "local" | "remote" | "equal" {
  const l = localTs
    ? typeof localTs === "number"
      ? localTs
      : Date.parse(localTs)
    : 0;
  const r = remoteTs
    ? typeof remoteTs === "number"
      ? remoteTs
      : Date.parse(remoteTs)
    : 0;
  if (l > r) return "local";
  if (l < r) return "remote";
  return "equal";
}

type QueueOpts = { baseMs?: number; maxMs?: number; concurrency?: number };
type EnqueueItem<T> = T & { id?: string };

export function createPendingQueue<T>(
  processor: (item: EnqueueItem<T>) => Promise<void>,
  opts: QueueOpts = {}
) {
  const baseMs = opts.baseMs ?? 800;
  const maxMs = opts.maxMs ?? 30_000;
  const concurrency = Math.max(1, Math.min(4, opts.concurrency ?? 1));
  let queue: EnqueueItem<T>[] = [];
  let running = 0;
  let attempt = 0;
  let onlineUnsub: (() => void) | null = null;

  const runNext = async () => {
    if (running >= concurrency) return;
    if (!queue.length) return;
    if (!(await isOnline())) return;
    const item = queue.shift()!;
    running += 1;
    try {
      await processor(item);
      attempt = 0;
    } catch {
      queue.unshift(item);
      attempt += 1;
      const delay = Math.min(maxMs, baseMs * Math.pow(2, attempt));
      setTimeout(() => {
        running = Math.max(0, running - 1);
        void flush();
      }, delay);
      return;
    }
    running = Math.max(0, running - 1);
    if (queue.length) void runNext();
  };

  const flush = async () => {
    if (!(await isOnline())) return;
    for (let i = 0; i < concurrency; i++) void runNext();
  };

  const enqueue = (item: EnqueueItem<T>) => {
    queue.push(item);
    void flush();
  };

  const size = () => queue.length;

  const clear = () => {
    queue = [];
    attempt = 0;
  };

  const attachOnlineListener = () => {
    if (onlineUnsub) return;
    onlineUnsub = onReconnect(() => {
      attempt = 0;
      void flush();
    });
  };

  const detachOnlineListener = () => {
    onlineUnsub?.();
    onlineUnsub = null;
  };

  return {
    enqueue,
    flush,
    size,
    clear,
    attachOnlineListener,
    detachOnlineListener,
  };
}

export async function fullSync(tasks: Array<() => Promise<void>>) {
  await Promise.all(tasks.map((t) => t()));
}
