import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";

/**
 * Hook to fetch paginated dataset list with search and sorting.
 */
export function useDatasetsList({
  page = 0,
  pageSize = 25,
  search = null,
  sortBy = null,
  sortOrder = "desc",
} = {}) {
  return useQuery({
    queryKey: ["datasets", "list", page, pageSize, search, sortBy, sortOrder],
    queryFn: async () => {
      const sort = sortBy
        ? JSON.stringify([
            {
              column_id: sortBy,
              type: sortOrder === "asc" ? "ascending" : "descending",
            },
          ])
        : null;
      const { data } = await axios.get(endpoints.develop.getDatasets(), {
        params: {
          search_text: search || null,
          page,
          page_size: pageSize,
          sort,
        },
      });
      return {
        items: data?.result?.datasets ?? [],
        total: data?.result?.total_count ?? 0,
      };
    },
    keepPreviousData: true,
  });
}

/**
 * Hook to bulk delete datasets.
 */
export function useBulkDeleteDatasets() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (datasetIds) => {
      const promises = datasetIds.map((id) =>
        axios.delete(endpoints.develop.deleteDataset(id)),
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["datasets", "list"] });
      queryClient.invalidateQueries({
        queryKey: ["develop", "dataset-name-list"],
      });
    },
  });
}
