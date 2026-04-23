import { useQuery } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";

export const useProjectDetails = ({
  page,
  pageLimit,
  debouncedSearchQuery,
  sort_by,
  sort_direction,
}) => {
  const { data, isLoading, error } = useQuery({
    queryKey: [
      "tracing-list-projects",
      page,
      pageLimit,
      debouncedSearchQuery,
      sort_by,
      sort_direction,
    ],

    queryFn: () =>
      axios.get(endpoints.project.projectObserveList, {
        params: {
          name: debouncedSearchQuery?.length ? debouncedSearchQuery : null,
          page_number: page - 1,
          page_size: pageLimit,
          project_type: "observe",
          ...(sort_by && { sort_by }),
          ...(sort_direction && { sort_direction }),
        },
      }),

    select: (response) => ({
      data: response?.data?.result?.table,
      totalPages: response?.data?.result?.metadata?.total_pages,
    }),
  });

  return {
    data: data?.data,
    totalPages: data?.totalPages,
    isLoading,
    error,
  };
};
