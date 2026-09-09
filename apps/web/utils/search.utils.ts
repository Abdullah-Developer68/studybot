import Fuse, { type IFuseOptions } from "fuse.js";

// Default Fuse options tuned for thread and item searching:
// - threshold: 0.4 balances typo tolerance with precision
// - ignoreLocation: true matches text anywhere without penalizing distance from start
// - minMatchCharLength: 1 enables instant search from the first character
const DEFAULT_FUSE_OPTIONS = {
  threshold: 0.4,
  ignoreLocation: true,
  minMatchCharLength: 1,
};

// Generic fuzzy search utility using fuse.js.
// Filters and ranks items according to the query and specified keys.
export const fuzzySearch = <T>(
  items: T[],
  query: string,
  keys: (keyof T | string)[],
  options?: Partial<IFuseOptions<T>>,
): T[] => {
  const trimmedQuery = query.trim();

  // If query is empty, return original items without running search
  if (!trimmedQuery) {
    return items;
  }

  const fuse = new Fuse(items, {
    ...DEFAULT_FUSE_OPTIONS,
    ...options,
    keys: keys as string[],
  });

  return fuse.search(trimmedQuery).map((result) => result.item);
};

