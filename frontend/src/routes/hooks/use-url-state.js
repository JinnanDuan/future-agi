import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function parseUrlValue(value, defaultValue) {
  if (value === null) return defaultValue;

  try {
    // Try to parse as JSON first
    return JSON.parse(value);
  } catch {
    // If parsing fails, return as is (for simple strings)
    return value;
  }
}

export function stringifyUrlValue(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export function useUrlState(key, defaultValue) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Keep useState for triggering re-renders
  const [value, setStateValue] = useState(() =>
    parseUrlValue(searchParams.get(key), defaultValue),
  );

  // Flag to track if the URL change was triggered internally
  const isInternalUpdate = useRef(false);

  // Update both state and URL
  const setValue = useCallback(
    (newValue, options = { replace: true }) => {
      setStateValue((currentValue) => {
        const nextValue =
          typeof newValue === "function" ? newValue(currentValue) : newValue;

        isInternalUpdate.current = true;

        // Functional form merges with the latest URL params so concurrent
        // setValue calls from different useUrlState hooks don't clobber each
        // other's writes in the same tick.
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            next.set(key, stringifyUrlValue(nextValue));
            return next;
          },
          { replace: options.replace },
        );

        return nextValue;
      });
    },
    [key, setSearchParams],
  );

  const removeValue = useCallback(
    (options = { replace: true }) => {
      isInternalUpdate.current = true;

      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.delete(key);
          return next;
        },
        { replace: options.replace },
      );

      setStateValue(defaultValue);
    },
    [key, setSearchParams, defaultValue],
  );

  // Handle external URL changes (like browser back/forward)
  useEffect(() => {
    if (isInternalUpdate.current) {
      isInternalUpdate.current = false;
      return;
    }

    const urlValue = searchParams.get(key) || stringifyUrlValue(defaultValue);
    const currentValue = stringifyUrlValue(value);

    if (currentValue === urlValue) {
      return;
    }

    const newValue = parseUrlValue(searchParams.get(key), defaultValue);
    setStateValue(newValue);
    // Dep array intentionally excludes `value`: the effect should only fire on
    // external URL changes. Including `value` causes spurious reruns on every
    // state update, where the stringified comparison can register a false
    // mismatch (e.g., when state carries a random id not in the URL payload)
    // and reset the state back to the URL's default.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, key, defaultValue]);

  return [value, setValue, removeValue];
}
