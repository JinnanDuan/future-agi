import { create } from "zustand";
import { debounce } from "lodash";
import { alertTypes } from "../common";
import { useShallow } from "zustand/react/shallow";

export const useAlertFilterStore = create((set, get) => ({
  activeFilters: [],
  showFilterSection: false,
  hasValidFilters: false,
  projectOptions: [],

  // Cache for computed values to prevent re-computation
  _availableFilterOptionsCache: null,
  _defaultFilterOptionsCache: null,
  _lastCacheKey: null,

  getDefaultFilterOptions: (mainPage) => {
    const state = get();
    const { projectOptions } = state;

    // Create cache key based on dependencies
    const cacheKey = JSON.stringify({
      mainPage,
      projectOptionsLength: projectOptions.length,
    });

    // Return cached result if inputs haven't changed
    if (state._lastCacheKey === cacheKey && state._defaultFilterOptionsCache) {
      return state._defaultFilterOptionsCache;
    }

    const result = [
      {
        value: "metric_type",
        label: "Alert Type",
        type: "dropdown",
        options: alertTypes.flatMap((group) => group.options),
      },
      {
        value: "status",
        label: "Status",
        type: "dropdown",
        options: [
          { label: "Triggered", value: "triggered" },
          { label: "Healthy", value: "healthy" },
        ],
      },
      ...(mainPage
        ? [
            {
              value: "project_id",
              label: "Project",
              type: "dropdown",
              multiple: true,
              options: projectOptions,
            },
          ]
        : []),
    ];

    // Cache the result
    set({
      _defaultFilterOptionsCache: result,
      _lastCacheKey: cacheKey,
    });

    return result;
  },

  getAvailableFilterOptions: (mainPage) => {
    const state = get();
    const { activeFilters } = state;

    // Create cache key based on dependencies
    const activeFiltersHash = JSON.stringify(
      activeFilters.map((f) => f.filterType),
    );
    const cacheKey = JSON.stringify({
      mainPage,
      activeFiltersHash,
      projectOptionsLength: state.projectOptions.length,
    });

    // Return cached result if inputs haven't changed
    if (
      state._lastCacheKey === cacheKey &&
      state._availableFilterOptionsCache
    ) {
      return state._availableFilterOptionsCache;
    }

    const defaultFilterOptions = state.getDefaultFilterOptions(mainPage);

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
      _lastCacheKey: cacheKey,
    });

    return result;
  },

  setProjectOptions: (options) => {
    const projectOptions =
      options?.map(({ id, name }) => ({
        label: name,
        value: id,
      })) || [];

    set({
      projectOptions,
      // Clear cache when project options change
      _availableFilterOptionsCache: null,
      _defaultFilterOptionsCache: null,
      _lastCacheKey: null,
    });
  },

  setActiveFilters: (filters) =>
    set({
      activeFilters: filters,
      // Clear cache when active filters change
      _availableFilterOptionsCache: null,
      _lastCacheKey: null,
    }),

  setShowFilterSection: (show) => set({ showFilterSection: show }),

  setHasValidFilters: (valid) => set({ hasValidFilters: valid }),

  addFilter: (mainPage) => {
    const { getDefaultFilterOptions } = get();

    set((state) => {
      const addedTypes = state.activeFilters.map((f) => f.filterType);
      const defaultFilterOptions = getDefaultFilterOptions(mainPage);
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
            filterValue: nextFilter.multiple ? [] : "",
            type: nextFilter.type,
            options: nextFilter.options || undefined,
            multiple: nextFilter.multiple || false,
          },
        ],
        // Clear cache when active filters change
        _availableFilterOptionsCache: null,
        _lastCacheKey: null,
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

    // Debounced validation
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
        // Clear cache when active filters change
        _availableFilterOptionsCache: null,
        _lastCacheKey: null,
      };
    });

    // Validate after removal
    get().debouncedValidateFilters();
  },

  updateFilterTypeByIndex: (index, newType, mainPage) => {
    const { getDefaultFilterOptions } = get();
    const defaultFilterOptions = getDefaultFilterOptions(mainPage);
    const newOption = defaultFilterOptions.find((opt) => opt.value === newType);

    if (!newOption) return;

    set((state) => ({
      ...state,
      activeFilters: state.activeFilters.map((f, i) =>
        i === index
          ? {
              filterType: newOption.value,
              filterValue: newOption.multiple ? [] : "",
              type: newOption.type,
              options: newOption.options || undefined,
              multiple: newOption.multiple || false,
            }
          : f,
      ),
      // Clear cache when active filters change
      _availableFilterOptionsCache: null,
      _lastCacheKey: null,
    }));

    // Validate after type change
    get().debouncedValidateFilters();
  },

  toggleFilter: (mainPage) => {
    const { showFilterSection, activeFilters, addFilter } = get();

    if (!showFilterSection && activeFilters.length === 0) {
      addFilter(mainPage);
    }

    set({ showFilterSection: !showFilterSection });
  },

  validateFilters: () => {
    const { activeFilters } = get();

    const valid = activeFilters.some((f) => {
      if (Array.isArray(f.filterValue)) return f.filterValue.length > 0;
      if (typeof f.filterValue === "string") return f.filterValue.trim() !== "";
      return f.filterValue != null;
    });

    set({ hasValidFilters: valid });
  },

  // Debounced validation function
  debouncedValidateFilters: debounce(() => {
    get().validateFilters();
  }, 300),

  clearAllFilters: () => {
    set({
      activeFilters: [],
      showFilterSection: false,
      hasValidFilters: false,
      // Clear cache
      _availableFilterOptionsCache: null,
      _defaultFilterOptionsCache: null,
      _lastCacheKey: null,
    });
  },

  resetFilters: () => {
    set({
      activeFilters: [],
      showFilterSection: false,
      hasValidFilters: false,
      // Clear cache
      _availableFilterOptionsCache: null,
      _defaultFilterOptionsCache: null,
      _lastCacheKey: null,
    });
  },
}));

// FIXED: No function wrappers - direct references only
export const useAlertFilterShallow = () => {
  return useAlertFilterStore(
    useShallow((state) => ({
      // State
      activeFilters: state.activeFilters,
      showFilterSection: state.showFilterSection,
      hasValidFilters: state.hasValidFilters,
      projectOptions: state.projectOptions,

      // Actions - direct references, no parameters needed
      setProjectOptions: state.setProjectOptions,
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
};

// Separate hooks for computed properties
export const useAlertFilterOptions = (mainPage) => {
  return useAlertFilterStore((state) =>
    state.getAvailableFilterOptions(mainPage),
  );
};

export const resetAlertFilterStoreState = () => {
  useAlertFilterStore.setState({
    activeFilters: [],
    showFilterSection: false,
    hasValidFilters: false,
    projectOptions: [],
    _availableFilterOptionsCache: null,
    _defaultFilterOptionsCache: null,
    _lastCacheKey: null,
  });
};
