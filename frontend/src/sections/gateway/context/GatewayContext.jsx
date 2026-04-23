import React, { createContext, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import axiosInstance, { endpoints } from "src/utils/axios";

export const GatewayContext = createContext(null);

export const GatewayProvider = ({ children }) => {
  const queryClient = useQueryClient();

  const {
    data: gatewaysResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["agentcc-gateways"],
    queryFn: async () => {
      const res = await axiosInstance.get(endpoints.gateway.list);
      return res.data;
    },
  });

  const gateways = gatewaysResponse?.result || [];

  // Single gateway — always use the first (and only) one
  const gateway = gateways[0] || null;

  const refreshGateways = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["agentcc-gateways"] });
  }, [queryClient]);

  const value = useMemo(
    () => ({
      // Primary — single gateway
      gateway,
      gatewayId: gateway?.id || null,
      // Backward compat
      gateways,
      // Utilities
      refreshGateways,
      isLoading,
      error,
    }),
    [gateway, gateways, refreshGateways, isLoading, error],
  );

  return (
    <GatewayContext.Provider value={value}>
      {children || <Outlet />}
    </GatewayContext.Provider>
  );
};

GatewayProvider.propTypes = {
  children: PropTypes.node,
};
