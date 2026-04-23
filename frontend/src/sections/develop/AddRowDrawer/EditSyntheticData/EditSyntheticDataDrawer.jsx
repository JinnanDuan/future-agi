import React, { useCallback } from "react";
import CreateSyntheticDataView from "../CreateSyntheticDataView";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDatasetQueryOptions } from "src/api/develop/develop-detail";
import { useParams } from "react-router";
import axios, { endpoints } from "src/utils/axios";
import { useEditSyntheticDataStore } from "./state";
import { useDevelopDetailContext } from "src/sections/develop-detail/Context/DevelopDetailContext";

export default function EditSyntheticDataDrawer() {
  const queryClient = useQueryClient();
  const { refreshGrid } = useDevelopDetailContext();
  const { dataset } = useParams();
  const onEditSuccessCallback = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: ["develop", "dataset-name-list"],
    });
    queryClient.invalidateQueries({
      queryKey: ["dataset-detail"],
    });
    queryClient.invalidateQueries({
      queryKey: ["develop-data"],
    });
    queryClient.invalidateQueries({
      queryKey: [dataset],
    });

    if (refreshGrid) {
      refreshGrid();
    }
  }, [queryClient, refreshGrid, dataset]);
  const { openSummaryDrawer } = useEditSyntheticDataStore();

  const { data: tableData } = useQuery(
    getDatasetQueryOptions(dataset, 0, [], [], "", { enabled: false }),
  );

  const { data, isLoading: _isLoading } = useQuery({
    queryKey: [
      dataset,
      tableData?.data?.result?.syntheticDataset,
      openSummaryDrawer,
    ],
    queryFn: () => axios.get(endpoints.develop.getSyntheticConfig(dataset)),
    enabled: !!dataset && !!tableData?.data?.result?.syntheticDataset,
    select: (d) => d.data?.result?.data,
  });
  return (
    <CreateSyntheticDataView
      onEditSuccessCallback={onEditSuccessCallback}
      editData={data}
      editMode={true}
    />
  );
}
