import { create } from "zustand";
import {
  // AssigneeCell,
  ErrorCell,
  // PriorityCell,
  TrendsCell,
} from "src/components/feed/FeedCell";
import { getDateAge } from "src/auth/context/jwt/utils";

const initialColumnDefs = [
  {
    headerName: "Error name",
    field: "error",
    flex: 2,
    sortable: true,
    cellRenderer: ErrorCell,
  },
  {
    headerName: "Last seen",
    field: "last_seen",
    flex: 1,
    sortable: true,
    cellStyle: {
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
    },
  },
  {
    headerName: "Age",
    field: "age",
    flex: 1,
    sortable: true,
    valueFormatter: (params) => getDateAge(params.value),
    cellStyle: {
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
    },
  },
  {
    headerName: "Trends",
    field: "trends",
    flex: 2,
    sortable: false,
    cellRenderer: TrendsCell,
    cellStyle: { overflow: "visible" },
    cellRendererParams: (params) => ({
      ...params,
      value: params?.data?.trends?.map((trend) => ({
        timestamp: trend?.timestamp,
        value: trend?.value || 0,
        users: trend?.users || 0,
      })),
    }),
  },
  {
    headerName: "Total Events",
    field: "events",
    flex: 1,
    sortable: true,
    cellStyle: {
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
    },
  },
  {
    headerName: "Users",
    field: "users",
    flex: 1,
    sortable: true,
    cellStyle: {
      display: "flex",
      justifyContent: "flex-start",
      alignItems: "center",
    },
    valueFormatter: (params) =>
      params.value && params.value > 0 ? params.value : "",
  },
  // {
  //   headerName: "Priority",
  //   field: "priority",
  //   flex: 1,
  //   sortable: true,
  //   cellRenderer: PriorityCell,
  //   cellStyle: {
  //     display: "flex",
  //     justifyContent: "flex-start",
  //     alignItems: "center",
  //   },
  // },
  // {
  //   headerName: "Assignee",
  //   field: "assignee",
  //   flex: 1,
  //   sortable: false,
  //   cellRenderer: AssigneeCell,
  //   cellStyle: {
  //     display: "flex",
  //     justifyContent: "flex-start",
  //     alignItems: "center",
  //   },
  // },
];

export const useFeedStore = create((set) => ({
  gridRef: null,
  searchQuery: "",
  selectedDay: 7,
  isFilterOpen: false,
  selectedProject: null,
  columnDefs: initialColumnDefs,

  setGridRef: (ref) => set({ gridRef: ref }),
  setColumnDefs: (defs) => set({ columnDefs: defs }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSelectedDay: (selectedDay) => set({ selectedDay }),
  setIsFilterOpen: (isFilterOpen) => set({ isFilterOpen }),
  setSelectedProject: (selectedProject) => set({ selectedProject }),
}));

export const useFeedDetailStore = create((set) => ({
  currentTraceId: null,
  timeRange: null,
  errorName: null,

  setCurrentTraceId: (traceId) => set({ currentTraceId: traceId }),
  setTimeRange: (range) => set({ timeRange: range }),
  setErrorName: (errorName) => set({ errorName }),
  resetStore: () =>
    set({ currentTraceId: null, timeRange: null, errorName: null }),
}));
