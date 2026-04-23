import { createContext, useContext } from "react";

export const ObserveHeaderContext = createContext({
  headerConfig: {
    text: "",
    filterTrace: null,
    filterSpan: null,
    selectedTab: null,
    filterSession: null,
    refreshData: null,
    resetFilters: null,
    gridApi: null,
    toolbarElement: null,
  },
  setHeaderConfig: () => {},
  // Active saved-view config (filters, columns, sort, display) — set when a
  // custom view tab is selected, null for default fixed tabs.
  activeViewConfig: null,
  setActiveViewConfig: () => {},
});

export const useObserveHeader = () => {
  return useContext(ObserveHeaderContext);
};
