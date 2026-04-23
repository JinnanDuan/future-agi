export const timeFilters = [
  // { label: "Last hour", value: 1/24 }, // minutes
  { label: "Last 24 hours", value: 1 },
  { label: "Last 7 days", value: 7 },
  { label: "Last 14 days", value: 14 },
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  // { label: "All days", value: "all" },
];

export const PRIORITIES = ["high", "medium", "low", "urgent"];

export const priorityMapper = {
  urgent: {
    icon: "/assets/icons/priorities/ic_urgent.svg",
    bgColor: "red.o5",
  },
  high: {
    icon: "/assets/icons/priorities/ic_high.svg",
    bgColor: "orange.o5",
  },
  medium: {
    icon: "/assets/icons/priorities/ic_mid.svg",
    bgColor: "#E6B8000D",
  },
  low: {
    icon: "/assets/icons/priorities/ic_low.svg",
    bgColor: "green.o5",
  },
};

export const threadStatusMapper = {
  unresolved: {
    icon: "/assets/icons/ic_close.svg",
  },
  resolved: {
    icon: "/assets/icons/ic_tick.svg",
  },
  ongoing: {
    icon: "/assets/icons/navbar/ic_get_started.svg",
  },
  "first-seen": {
    icon: "/assets/icons/ic_flag.svg",
  },
};

export const columnOptions = [
  { key: "latency", label: "Latency", visible: true },
  { key: "tokens", label: "Tokens", visible: true },
  { key: "cost", label: "Cost", visible: true },
  { key: "evals", label: "Evals", visible: true },
  { key: "annotations", label: "Annotations", visible: true },
  { key: "events", label: "Events", visible: true },
];

// export const traceData = {
//   traceId: "7d27e07c-b35f-456c-8c37-5d0db9cfdd34",
//   filters: [
//     {
//       columnId: "created_at",
//       filterConfig: {
//         filterType: "datetime",
//         filterOp: "between",
//         filterValue: ["2025-03-02T11:31:31.000Z", "2025-09-02T18:29:59.000Z"],
//       },
//     },
//   ],
// };
