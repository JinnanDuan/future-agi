import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";

// Fetches every child template referenced by the composite editor and
// returns the *union* of their `required_keys` — the full variable set
// the composite will need mapped when it's bound to a dataset.
//
// Uses react-query's `useQueries` so the number of fetches scales with
// the number of children without violating the rules of hooks. All
// requests share the `["evals","detail",templateId]` cache with
// `useEvalDetail` so there's no duplicate network cost.
export function useCompositeChildrenUnionKeys(children = []) {
  const childIds = useMemo(
    () => children.map((c) => c?.child_id).filter(Boolean),
    [children],
  );

  const results = useQueries({
    queries: childIds.map((id) => ({
      queryKey: ["evals", "detail", id],
      queryFn: async () => {
        const { data } = await axios.get(
          endpoints.develop.eval.getEvalDetail(id),
        );
        return data?.result;
      },
      enabled: !!id,
    })),
  });

  return useMemo(() => {
    const union = new Set();
    results.forEach((q) => {
      const r = q?.data;
      const keys =
        r?.required_keys ||
        r?.config?.required_keys ||
        r?.config?.requiredKeys ||
        [];
      keys.forEach((k) => union.add(k));
    });
    return [...union];
  }, [results]);
}
