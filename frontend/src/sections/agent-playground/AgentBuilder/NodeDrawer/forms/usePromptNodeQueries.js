import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import _ from "lodash";
import axios, { endpoints } from "src/utils/axios";
import { DEFAULT_RESPONSE_FORMAT_OPTIONS } from "src/sections/agent-playground/utils/constants";

/**
 * Custom hook for fetching data related to prompt node form
 * @param {string} watchedModel - Selected model name
 * @param {string} watchedModelProvider - Selected model provider
 * @returns {Object} Query results and derived data
 */
export function usePromptNodeQueries(watchedModel, watchedModelProvider) {
  // Fetch response schema for custom output types
  const { data: responseSchema, isLoading: isLoadingResponseSchema } = useQuery(
    {
      queryKey: ["response-schema"],
      queryFn: () => axios.get(endpoints.develop.runPrompt.responseSchema),
      select: (d) => d.data?.results,
      staleTime: 1 * 60 * 1000,
    },
  );

  // Fetch dynamic model params based on selected model
  const { data: modelParams } = useQuery({
    queryKey: ["model-params", watchedModel, "llm", watchedModelProvider],
    queryFn: () =>
      axios.get(endpoints.develop.modelParams, {
        params: {
          model: watchedModel,
          provider: watchedModelProvider,
          model_type: "llm",
        },
      }),
    enabled: !!(watchedModel && watchedModelProvider),
    select: (d) => d.data?.result,
  });

  // Build menu items for response format dropdown
  const responseFormatMenuItems = useMemo(() => {
    const menus = [...DEFAULT_RESPONSE_FORMAT_OPTIONS];

    // Add custom schemas from API
    responseSchema?.forEach((item) => {
      menus.push({ label: item.name, value: item.id });
    });

    // Add model-specific response formats
    modelParams?.responseFormat?.forEach((item) => {
      const exists = menus.some((m) => m.value === item.value);
      if (!exists) {
        menus.push({
          label: _.startCase(item.value),
          value: item.value,
        });
      }
    });

    return menus;
  }, [responseSchema, modelParams?.responseFormat]);

  return {
    responseSchema,
    modelParams,
    responseFormatMenuItems,
    isLoading: isLoadingResponseSchema,
  };
}
