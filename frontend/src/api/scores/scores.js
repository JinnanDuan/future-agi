import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "src/utils/axios";
import { enqueueSnackbar } from "notistack";

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const scoreKeys = {
  all: ["scores"],
  forSource: (sourceType, sourceId) => ["scores", sourceType, sourceId],
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch all scores for a given source (trace, span, session, etc.)
 */
export const useScoresForSource = (sourceType, sourceId, options = {}) => {
  return useQuery({
    queryKey: scoreKeys.forSource(sourceType, sourceId),
    queryFn: () =>
      axios.get("/model-hub/scores/for-source/", {
        params: { source_type: sourceType, source_id: sourceId },
      }),
    select: (d) => d.data?.result || d.data,
    enabled: !!sourceType && !!sourceId,
    staleTime: 1000 * 60,
    ...options,
  });
};

/**
 * Fetch span-level notes for an observation_span source.
 * Returns the span_notes array from the for-source endpoint.
 */
export const useSpanNotes = (spanId, options = {}) => {
  return useQuery({
    queryKey: ["span-notes", spanId],
    queryFn: () =>
      axios.get("/model-hub/scores/for-source/", {
        params: { source_type: "observation_span", source_id: spanId },
      }),
    select: (d) => d.data?.span_notes || [],
    enabled: !!spanId,
    staleTime: 1000 * 60,
    ...options,
  });
};

/**
 * Create a single score.
 */
export const useCreateScore = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceType,
      sourceId,
      labelId,
      value,
      notes,
      scoreSource,
    }) =>
      axios.post("/model-hub/scores/", {
        source_type: sourceType,
        source_id: sourceId,
        label_id: labelId,
        value,
        notes,
        score_source: scoreSource || "human",
      }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: scoreKeys.forSource(variables.sourceType, variables.sourceId),
      });
      // Invalidate queue items for this specific source in case queue items got auto-completed
      queryClient.invalidateQueries({
        queryKey: ["annotation-queues", "for-source"],
      });
    },
    onError: (error) => {
      const msg = error?.result || error?.detail || "Failed to save score";
      enqueueSnackbar(typeof msg === "string" ? msg : JSON.stringify(msg), {
        variant: "error",
      });
    },
  });
};

/**
 * Create multiple scores on a single source (inline annotator).
 */
export const useBulkCreateScores = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceType, sourceId, scores, notes, spanNotes, scoreSource }) => {
      const payload = {
        source_type: sourceType,
        source_id: sourceId,
        scores,
        notes,
        score_source: scoreSource || "human",
      };
      // Only include span_notes when the user has actually typed something.
      // Omitting it entirely prevents the backend from treating an empty
      // submission as an intentional delete of an existing SpanNote.
      if (spanNotes) {
        payload.span_notes = spanNotes;
      }
      return axios.post("/model-hub/scores/bulk/", payload);
    },
    onSuccess: (data, variables) => {
      enqueueSnackbar("Annotations saved", { variant: "success" });
      queryClient.invalidateQueries({
        queryKey: scoreKeys.forSource(variables.sourceType, variables.sourceId),
      });
      queryClient.invalidateQueries({
        queryKey: ["span-notes", variables.sourceId],
      });
      // Invalidate queue items for this specific source in case queue items got auto-completed
      queryClient.invalidateQueries({
        queryKey: ["annotation-queues", "for-source"],
      });
    },
    onError: (error) => {
      const msg =
        error?.result || error?.detail || "Failed to save annotations";
      enqueueSnackbar(typeof msg === "string" ? msg : JSON.stringify(msg), {
        variant: "error",
      });
    },
  });
};

/**
 * Delete a score.
 */
export const useDeleteScore = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scoreId }) => axios.delete(`/model-hub/scores/${scoreId}/`),
    onSuccess: (data, variables) => {
      if (variables.sourceType && variables.sourceId) {
        queryClient.invalidateQueries({
          queryKey: scoreKeys.forSource(
            variables.sourceType,
            variables.sourceId,
          ),
        });
      } else {
        queryClient.invalidateQueries({ queryKey: scoreKeys.all });
      }
    },
    onError: () => {
      enqueueSnackbar("Failed to delete score", { variant: "error" });
    },
  });
};
