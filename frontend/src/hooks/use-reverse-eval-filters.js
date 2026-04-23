import { useMemo, useRef } from "react";
import { useGetValidatedFilters } from "./use-get-validated-filters";

const reverseFilter = (filterConfig) => {
  const fil = { ...filterConfig };
  switch (filterConfig.filterOp) {
    case "equals":
    case "not_equals":
      fil.filterValue = 100 - filterConfig.filterValue;
      break;
    case "greater_than":
      fil.filterOp = "less_than";
      fil.filterValue = 100 - filterConfig.filterValue;
      break;
    case "less_than":
      fil.filterOp = "greater_than";
      fil.filterValue = 100 - filterConfig.filterValue;
      break;
    case "greater_than_or_equal":
      fil.filterOp = "less_than_or_equal";
      fil.filterValue = 100 - filterConfig.filterValue;
      break;
    case "less_than_or_equal":
      fil.filterOp = "greater_than_or_equal";
      fil.filterValue = 100 - filterConfig.filterValue;
      break;
    case "between":
    case "not_in_between":
      fil.filterValue = [
        100 - filterConfig.filterValue[1],
        100 - filterConfig.filterValue[0],
      ];
      break;
    default:
      break;
  }
  return fil;
};

const useReverseEvalFilters = (
  filters,
  reverseEvalColumnIds,
  getCustomProperties,
) => {
  const previousReverseFilters = useRef([]);
  const validatedFilters = useGetValidatedFilters(filters, getCustomProperties);

  const reverseEvalFilters = useMemo(() => {
    return validatedFilters.map((filter) => {
      if (reverseEvalColumnIds.includes(filter.columnId)) {
        return {
          ...filter,
          filterConfig: {
            ...reverseFilter(filter.filterConfig),
          },
        };
      }
      return filter;
    });
  }, [validatedFilters, reverseEvalColumnIds]);

  if (
    JSON.stringify(previousReverseFilters.current) ===
    JSON.stringify(reverseEvalFilters)
  ) {
    return previousReverseFilters.current;
  }
  previousReverseFilters.current = reverseEvalFilters;

  return reverseEvalFilters;
};

export default useReverseEvalFilters;
