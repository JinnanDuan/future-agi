import { useState } from "react";
import PropTypes from "prop-types";
import React from "react";

import { ObserveHeaderContext } from "./ObserveHeaderContext";

const ObserveHeaderProvider = ({ children }) => {
  const [headerConfig, setHeaderConfig] = useState({
    text: "",
    filterTrace: null,
    filterSpan: null,
    selectedTab: null,
    filterSession: null,
    refreshData: null,
    resetFilters: null,
    gridApi: null,
  });

  // Config from the active saved-view tab (null for fixed default tabs)
  const [activeViewConfig, setActiveViewConfig] = useState(null);

  return (
    <ObserveHeaderContext.Provider
      value={{
        headerConfig,
        setHeaderConfig,
        activeViewConfig,
        setActiveViewConfig,
      }}
    >
      {children}
    </ObserveHeaderContext.Provider>
  );
};

ObserveHeaderProvider.propTypes = {
  children: PropTypes.node,
};

export default ObserveHeaderProvider;
