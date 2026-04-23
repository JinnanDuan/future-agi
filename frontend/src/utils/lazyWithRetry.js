import { lazy } from "react";

const RELOAD_KEY = "chunk_reload_attempted";

/**
 * Drop-in replacement for React.lazy that retries failed dynamic imports.
 *
 * After a deployment, old chunks may no longer exist on the server.
 * This wrapper:
 *   1. Retries the import up to `maxRetries` times with cache-busting query params
 *   2. On final failure, does a silent one-time page reload (uses sessionStorage
 *      to prevent infinite loops)
 *   3. No version banners or update notifications — completely invisible to users
 *
 * Usage:
 *   const MyPage = lazyWithRetry(() => import("./MyPage"));
 */
export default function lazyWithRetry(importFn, maxRetries = 3) {
  return lazy(() => retryImport(importFn, maxRetries));
}

async function retryImport(importFn, retriesLeft) {
  try {
    const module = await importFn();
    // Success — clear any previous reload flag
    sessionStorage.removeItem(RELOAD_KEY);
    return module;
  } catch (error) {
    if (retriesLeft > 0 && isChunkError(error)) {
      // Wait briefly — CDN may need time to propagate new chunks
      await new Promise((r) => setTimeout(r, 1000 * (4 - retriesLeft)));
      return retryImport(importFn, retriesLeft - 1);
    }

    // All retries exhausted — try a silent one-time page reload
    if (isChunkError(error) && !sessionStorage.getItem(RELOAD_KEY)) {
      sessionStorage.setItem(RELOAD_KEY, "1");
      window.location.reload();
      // Return a never-resolving promise to prevent React error boundary
      // while the page reloads
      return new Promise(() => {});
    }

    // Not a chunk error or reload already attempted — throw original error
    throw error;
  }
}

export function isChunkError(error) {
  if (!error) return false;
  const msg = error?.message || "";
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk") ||
    msg.includes("Unable to preload CSS") ||
    msg.includes("is not a valid JavaScript MIME type") ||
    error?.name === "ChunkLoadError"
  );
}
