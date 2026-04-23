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
      // Update state using functional update to ensure latest value
      setStateValue((currentValue) => {
        const nextValue =
          typeof newValue === "function" ? newValue(currentValue) : newValue;

        // Mark this as an internal update
        isInternalUpdate.current = true;

        // Update URL
        const newSearchParams = new URLSearchParams(window.location.search);
        newSearchParams.set(key, stringifyUrlValue(nextValue));
        setSearchParams(newSearchParams, { replace: options.replace });

        return nextValue;
      });
    },
    [key, setSearchParams], // Removed value from dependencies since we use functional updates
  );
  const removeValue = useCallback(
    (options = { replace: true }) => {
      isInternalUpdate.current = true;

      const newSearchParams = new URLSearchParams(window.location.search);
      newSearchParams.delete(key);
      setSearchParams(newSearchParams, { replace: options.replace });

      // Reset state (or set to undefined if you prefer).
      setStateValue(defaultValue);
    },
    [key, setSearchParams, defaultValue],
  );
  // Handle external URL changes (like browser back/forward)
  useEffect(() => {
    if (isInternalUpdate.current) {
      // Reset the flag and skip the updateuseUrlState
      isInternalUpdate.current = false;
      return;
    }

    const urlValue = searchParams.get(key) || stringifyUrlValue(defaultValue);
    const currentValue = stringifyUrlValue(value);

    if (currentValue === urlValue) {
      return;
    }

    // Update state only if the change came from external source
    const newValue = parseUrlValue(searchParams.get(key), defaultValue);
    setStateValue(newValue);
  }, [searchParams, key, defaultValue, value]);

  return [value, setValue, removeValue];
}
