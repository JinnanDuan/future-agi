import { useQuery } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";
import { useFeedDetailStore } from "./store/store";

export const useFeedDetails = (id) => {
  const { currentTraceId, timeRange } = useFeedDetailStore();
  const params = {};

  if (currentTraceId) {
    params["current_trace_id"] = currentTraceId;
  }
  if (timeRange) {
    params["trend_days"] = timeRange;
  }

  return useQuery({
    queryKey: ["feed-details", id, currentTraceId, timeRange],
    queryFn: () =>
      axios.get(endpoints.feed.getFeedDetails(id), {
        params: params,
      }),
    select: (res) => res?.data?.result,
    enabled: !!id,
  });
};
