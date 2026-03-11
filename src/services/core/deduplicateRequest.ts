export function createRequestDeduplicator<K, V>() {
  const inFlight = new Map<K, Promise<V>>();

  return async function deduplicate(
    key: K,
    factory: () => Promise<V>,
  ): Promise<V> {
    const existing = inFlight.get(key);
    if (existing) {
      return existing;
    }

    const request = factory();
    inFlight.set(key, request);

    try {
      return await request;
    } finally {
      if (inFlight.get(key) === request) {
        inFlight.delete(key);
      }
    }
  };
}
