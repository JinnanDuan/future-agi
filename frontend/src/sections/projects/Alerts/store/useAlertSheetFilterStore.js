import { create } from "zustand";
import { debounce } from "lodash";
import { useShallow } from "zustand/react/shallow";

const defaultFilterOptions = [
  {
    value: "type",
    label: "Trigger Type",
    type: "dropdown",
    options: [
      { label: "Critical", value: "critical" },
      { label: "Warning", value: "warning" },
    ],
  },
];

export const useAlertSheetFilterStore = create((set, get) => ({
  activeFilters: [],
  showFilterSection: false,
  hasValidFilters: false,

  // Cache for computed values to prevent re-computation
  _availableFilterOptionsCache: null,
  _lastActiveFiltersHash: null,

  getAvailableFilterOptions: () => {
    const state = get();
    const { activeFilters } = state;

    // Create a hash of activeFilters to check if it changed
    const currentHash = JSON.stringify(activeFilters.map((f) => f.filterType));

    // Return cached result if activeFilters haven't changed
    if (
      state._lastActiveFiltersHash === currentHash &&
      state._availableFilterOptionsCache
    ) {
      return state._availableFilterOptionsCache;
    }

    // Compute new result
    const result = defaultFilterOptions.map((opt) => {
      const isUsed = activeFilters.some((f) => f.filterType === opt.value);
      return {
        ...opt,
        disabled: isUsed,
      };
    });

    // Cache the result
    set({
      _availableFilterOptionsCache: result,
      _lastActiveFiltersHash: currentHash,
    });

    return result;
  },

  setActiveFilters: (filters) => {
    set({
      activeFilters: filters,
      // Clear cache when activeFilters change
      _availableFilterOptionsCache: null,
      _lastActiveFiltersHash: null,
    });
  },

  setShowFilterSection: (show) => set({ showFilterSection: show }),

  setHasValidFilters: (valid) => set({ hasValidFilters: valid }),

  addFilter: () => {
    set((state) => {
      const addedTypes = state.activeFilters.map((f) => f.filterType);
      const nextFilter = defaultFilterOptions.find(
        (opt) => !addedTypes.includes(opt.value),
      );

      if (!nextFilter) return state;

      return {
        ...state,
        activeFilters: [
          ...state.activeFilters,
          {
            filterType: nextFilter.value,
            filterValue: "",
            type: nextFilter.type,
            options: nextFilter.options || undefined,
          },
        ],
        // Clear cache when activeFilters change
        _availableFilterOptionsCache: null,
        _lastActiveFiltersHash: null,
      };
    });
  },

  updateFilterValueByIndex: (index, newValue) => {
    set((state) => ({
      ...state,
      activeFilters: state.activeFilters.map((f, i) =>
        i === index ? { ...f, filterValue: newValue } : f,
      ),
    }));

    // Trigger debounced validation
    get().debouncedValidateFilters();
  },

  removeFilterByIndex: (index) => {
    set((state) => {
      const updatedFilters = state.activeFilters.filter((_, i) => i !== index);
      const shouldHideSection = updatedFilters.length === 0;

      return {
        ...state,
        activeFilters: updatedFilters,
        showFilterSection: shouldHideSection ? false : state.showFilterSection,
        // Clear cache when activeFilters change
        _availableFilterOptionsCache: null,
        _lastActiveFiltersHash: null,
      };
    });

    // Trigger debounced validation
    get().debouncedValidateFilters();
  },

  updateFilterTypeByIndex: (index, newType) => {
    const newOption = defaultFilterOptions.find((opt) => opt.value === newType);
    if (!newOption) return;

    set((state) => ({
      ...state,
      activeFilters: state.activeFilters.map((f, i) =>
        i === index
          ? {
              filterType: newOption.value,
              filterValue: "",
              type: newOption.type,
              options: newOption.options || undefined,
            }
          : f,
      ),
      // Clear cache when activeFilters change
      _availableFilterOptionsCache: null,
      _lastActiveFiltersHash: null,
    }));

    // Trigger debounced validation
    get().debouncedValidateFilters();
  },

  toggleFilter: () => {
    const { showFilterSection, activeFilters, addFilter } = get();

    if (!showFilterSection && activeFilters.length === 0) {
      addFilter();
    }

    set({ showFilterSection: !showFilterSection });
  },

  // ========== VALIDATION ==========
  validateFilters: () => {
    const { activeFilters } = get();

    const valid = activeFilters.some((f) => {
      if (typeof f.filterValue === "string") return f.filterValue.trim() !== "";
      return f.filterValue != null;
    });

    set({ hasValidFilters: valid });
  },

  // Debounced validation function
  debouncedValidateFilters: debounce(() => {
    get().validateFilters();
  }, 300),

  // ========== UTILITY ACTIONS ==========
  clearAllFilters: () => {
    set({
      activeFilters: [],
      showFilterSection: false,
      hasValidFilters: false,
      // Clear cache
      _availableFilterOptionsCache: null,
      _lastActiveFiltersHash: null,
    });
  },

  resetFilters: () => {
    set({
      activeFilters: [],
      showFilterSection: false,
      hasValidFilters: false,
      // Clear cache
      _availableFilterOptionsCache: null,
      _lastActiveFiltersHash: null,
    });
  },
}));

// FIXED: Remove computed property from shallow selector
export const useAlertSheetFilterShallow = () =>
  useAlertSheetFilterStore(
    useShallow((state) => ({
      // State
      activeFilters: state.activeFilters,
      showFilterSection: state.showFilterSection,
      hasValidFilters: state.hasValidFilters,

      // Actions only - no computed properties
      setActiveFilters: state.setActiveFilters,
      setShowFilterSection: state.setShowFilterSection,
      setHasValidFilters: state.setHasValidFilters,
      addFilter: state.addFilter,
      updateFilterValueByIndex: state.updateFilterValueByIndex,
      removeFilterByIndex: state.removeFilterByIndex,
      updateFilterTypeByIndex: state.updateFilterTypeByIndex,
      toggleFilter: state.toggleFilter,
      clearAllFilters: state.clearAllFilters,
      resetFilters: state.resetFilters,
      validateFilters: state.validateFilters,
    })),
  );

// Separate hook for computed properties
export const useAlertSheetFilterOptions = () =>
  useAlertSheetFilterStore((state) => state.getAvailableFilterOptions());

export const resetAlertSheetFilterStoreState = () => {
  useAlertSheetFilterStore.setState({
    activeFilters: [],
    showFilterSection: false,
    hasValidFilters: false,
    _availableFilterOptionsCache: null,
    _lastActiveFiltersHash: null,
  });
};
