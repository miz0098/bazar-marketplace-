/** Optional tab-local demo history. No user identity, telemetry or remote persistence. */
export function createDemoRecentViews(
  storage = {
    read: () => sessionStorage.getItem('bazar-demo-recent-v1'),
    write: (value: string) =>
      sessionStorage.setItem('bazar-demo-recent-v1', value),
  },
) {
  const empty: readonly string[] = [];
  let snapshot = empty;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => empty,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    visit(currentId: string, knownIds: readonly string[]) {
      let next: readonly string[] = empty;
      try {
        const raw: unknown = JSON.parse(storage.read() ?? '[]');
        if (Array.isArray(raw))
          next = [
            ...new Set(
              raw.filter(
                (id): id is string =>
                  typeof id === 'string' &&
                  id !== currentId &&
                  knownIds.includes(id),
              ),
            ),
          ].slice(0, 4);
        storage.write(JSON.stringify([currentId, ...next]));
      } catch {
        /* Optional history must not prevent browsing. */
      }
      if (next.join('\0') !== snapshot.join('\0')) {
        snapshot = next;
        listeners.forEach((listener) => listener());
      }
    },
  };
}
