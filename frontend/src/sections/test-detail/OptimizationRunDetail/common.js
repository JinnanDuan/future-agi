import { KeyOptimizerMapping } from "../CreateEditOptimization/common";
import OptimizationNameRenderer from "./CellRenderers/OptimizationNameRenderer";
import StatusCellRenderer from "./CellRenderers/StatusCellRenderer";

export const getOptimizationRunDetailColumDef = () => {
  return [
    {
      field: "optimizations",
      headerName: "Optimizations",
      valueGetter: (params) => ({
        title: params.data?.optimisationName,
        startedAt: params.data?.startedAt,
      }),
      flex: 1,
      cellRenderer: OptimizationNameRenderer,
    },
    {
      field: "noOfTrials",
      headerName: "No. of Trials",
      minWidth: 150,
    },
    {
      field: "optimizationType",
      headerName: "Optimization Type",
      valueGetter: (params) => KeyOptimizerMapping[params.data?.optimiserType],
      minWidth: 200,
    },
    {
      field: "status",
      headerName: "Status",
      cellRenderer: StatusCellRenderer,
      minWidth: 150,
    },
  ];
};
