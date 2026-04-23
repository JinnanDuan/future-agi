import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";

/**
 * Hook to fetch a single eval template's detail.
 */
export function useEvalDetail(templateId) {
  return useQuery({
    queryKey: ["evals", "detail", templateId],
    queryFn: async () => {
      const { data } = await axios.get(
        endpoints.develop.eval.getEvalDetail(templateId),
      );
      return data?.result;
    },
    enabled: !!templateId,
  });
}

/**
 * Hook to update an eval template.
 * Invalidates the detail + list caches on success.
 */
export function useUpdateEval(templateId) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await axios.put(
        endpoints.develop.eval.updateEvalTemplate(templateId),
        payload,
      );
      return data?.result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["evals", "detail", templateId],
      });
      queryClient.invalidateQueries({ queryKey: ["evals", "list"] });
    },
  });
}
