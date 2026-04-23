import { useQuery } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";

export const useApiKeysStatus = (options) => {
  return useQuery({
    queryKey: ["api-key-status"],
    queryFn: () => axios.get(endpoints.develop.apiKey.status),
    select: (d) => d.data?.result?.providers,
    staleTime: 30 * 60 * 1000, // 30 min stale time
    ...options,
  });
};
