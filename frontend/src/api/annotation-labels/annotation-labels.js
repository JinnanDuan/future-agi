import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "src/utils/axios";
import { enqueueSnackbar } from "notistack";

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------
export const annotationLabelEndpoints = {
  list: "/model-hub/annotations-labels/",
  create: "/model-hub/annotations-labels/",
  detail: (id) => `/model-hub/annotations-labels/${id}/`,
  restore: (id) => `/model-hub/annotations-labels/${id}/restore/`,
};

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------
export const annotationLabelKeys = {
  all: ["annotation-labels"],
  list: (filters) => ["annotation-labels", "list", filters],
  detail: (id) => ["annotation-labels", "detail", id],
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export const useAnnotationLabelsList = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: annotationLabelKeys.list(filters),
    queryFn: () =>
      axios.get(annotationLabelEndpoints.list, { params: filters }),
    select: (d) => d.data,
    staleTime: 1000 * 60 * 2,
    ...options,
  });
};

export const useCreateAnnotationLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => axios.post(annotationLabelEndpoints.create, data),
    onSuccess: () => {
      enqueueSnackbar("Label created successfully", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: annotationLabelKeys.all });
    },
    onError: (error) => {
      const msg = error?.result || error?.detail || "Failed to create label";
      enqueueSnackbar(typeof msg === "string" ? msg : JSON.stringify(msg), {
        variant: "error",
      });
    },
  });
};

export const useUpdateAnnotationLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      axios.put(annotationLabelEndpoints.detail(id), data),
    onSuccess: () => {
      enqueueSnackbar("Label updated successfully", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: annotationLabelKeys.all });
    },
    onError: (error) => {
      const msg = error?.result || error?.detail || "Failed to update label";
      enqueueSnackbar(typeof msg === "string" ? msg : JSON.stringify(msg), {
        variant: "error",
      });
    },
  });
};

export const useDeleteAnnotationLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => axios.delete(annotationLabelEndpoints.detail(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: annotationLabelKeys.all });
    },
    onError: () => {
      enqueueSnackbar("Failed to archive label", { variant: "error" });
    },
  });
};

export const useRestoreAnnotationLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => axios.post(annotationLabelEndpoints.restore(id)),
    onSuccess: () => {
      enqueueSnackbar("Label restored", { variant: "success" });
      queryClient.invalidateQueries({ queryKey: annotationLabelKeys.all });
    },
    onError: () => {
      enqueueSnackbar("Failed to restore label", { variant: "error" });
    },
  });
};
