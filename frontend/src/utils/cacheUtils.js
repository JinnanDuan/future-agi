/**
 * Utility functions for managing React Query cache
 */

import logger from "./logger";

/**
 * Invalidates and refetches dataset list cache
 * @param {QueryClient} queryClient - React Query client instance
 */
export const invalidateDatasetListCache = (queryClient) => {
  if (!queryClient) {
    logger.warn("QueryClient not provided to invalidateDatasetListCache");
    return;
  }

  try {
    // Invalidate all dataset-related queries
    queryClient.invalidateQueries({
      queryKey: ["develop", "dataset-name-list"],
    });
    queryClient.invalidateQueries({ queryKey: ["develop", "dataset-list"] });

    // Force refetch to ensure immediate update
    queryClient.refetchQueries({ queryKey: ["develop", "dataset-name-list"] });
  } catch (error) {
    logger.error("Error invalidating dataset cache:", error);
  }
};

/**
 * Invalidates experiment-related cache
 * @param {QueryClient} queryClient - React Query client instance
 * @param {string} datasetId - Optional dataset ID for specific invalidation
 */
export const invalidateExperimentCache = (queryClient, datasetId = null) => {
  if (!queryClient) {
    logger.warn("QueryClient not provided to invalidateExperimentCache");
    return;
  }

  try {
    queryClient.invalidateQueries({ queryKey: ["experiments"] });
    if (datasetId) {
      queryClient.invalidateQueries({ queryKey: ["experiments", datasetId] });
    }
  } catch (error) {
    logger.error("Error invalidating experiment cache:", error);
  }
};
