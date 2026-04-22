// Process an array of items through an async function with a concurrency cap.
// Useful for staying under Riot rate limits when fetching many items in parallel.
export async function batchWithLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;

  async function worker() {
    while (idx < items.length) {
      const current = idx++;
      try {
        results[current] = await fn(items[current], current);
      } catch (e) {
        // On failure, leave undefined in that slot; caller can filter
        results[current] = undefined as unknown as R;
      }
    }
  }

  const workers = Array(Math.min(limit, items.length))
    .fill(0)
    .map(() => worker());

  await Promise.all(workers);
  return results;
}
