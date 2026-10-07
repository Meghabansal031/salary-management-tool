import { useEffect, useState } from "react";

/** The value, but only after it has stopped changing for `delayMs`. Used so typing does not search on every key. */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer); // typing again cancels the pending update
  }, [value, delayMs]);

  return debounced;
}
