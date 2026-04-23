import React, { useMemo, useCallback, useEffect } from "react";
import PropTypes from "prop-types";
import { Box, Paper, useTheme, CircularProgress, Alert } from "@mui/material";
import { Outlet, useLocation, useNavigate, useParams } from "react-router";

import { useObserveHeader } from "../project/context/ObserveHeaderContext";
import { useUrlState } from "src/routes/hooks/use-url-state";

import ObserveHeader from "./ObserveHeader";
import {
  ObserveTabBar,
  ViewConfigModal,
  TabContextMenu,
} from "src/components/observe-tabs";
import ObserveTabs from "./ObserveTabs";
import { useTabStoreShallow } from "./LLMTracing/tabStore";
import { useGetProjectDetails } from "src/api/project/project-detail";
import { useGetSavedViews } from "src/api/project/saved-views";
import ReplayDrawer from "./ReplayDrawer/ReplayDrawer";
import {
  resetReplaySessionsStore,
  resetSessionsGridStore,
} from "./SessionsView/ReplaySessions/store";
import { resetTraceGridStore } from "./LLMTracing/states";
import { resetTabStore } from "./LLMTracing/tabStore";

// Loading component for tab content
const TabContentLoader = () => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "200px",
      backgroundColor: "background.paper",
    }}
  >
    <CircularProgress />
  </Box>
);

// Error boundary component
const TabErrorBoundary = ({ children }) => {
  return (
    <React.Suspense fallback={<TabContentLoader />}>{children}</React.Suspense>
  );
};

TabErrorBoundary.propTypes = {
  children: PropTypes.node.isRequired,
};

// Routes that use the new tab system (ObserveTabBar)
const TAB_SYSTEM_ROUTES = ["llm-tracing", "sessions", "users"];

// Map observe tab keys to route + URL params
const TAB_TO_ROUTE = {
  traces: { route: "llm-tracing", params: { selectedTab: "trace" } },
  sessions: { route: "sessions", params: {} },
  users: { route: "users", params: {} },
};

const ObservePage = React.memo(() => {
  const { headerConfig, setActiveViewConfig } = useObserveHeader();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { observeId } = useParams();
  const { data: projectDetail } = useGetProjectDetails(observeId);
  const { data: savedViewsData } = useGetSavedViews(observeId);

  // Tab store state for modals and context menu
  const {
    createModalOpen,
    editModalView,
    contextMenuAnchor,
    closeCreateModal,
    closeContextMenu,
    startRenaming,
  } = useTabStoreShallow((s) => ({
    createModalOpen: s.createModalOpen,
    editModalView: s.editModalView,
    contextMenuAnchor: s.contextMenuAnchor,
    closeCreateModal: s.closeCreateModal,
    closeContextMenu: s.closeContextMenu,
    startRenaming: s.startRenaming,
  }));

  // Active tab for the new tab system
  const [activeTab, setActiveTab] = useUrlState("tab", "traces");

  // Determine if current route uses the new tab system
  const currentRouteSegment = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "llm-tracing";
  }, [location.pathname]);

  const isTabSystemRoute = TAB_SYSTEM_ROUTES.includes(currentRouteSegment);

  // Derive active tab from URL on initial load / route changes
  useEffect(() => {
    if (currentRouteSegment === "sessions") {
      setActiveTab("sessions");
    } else if (currentRouteSegment === "users") {
      setActiveTab("users");
    } else if (currentRouteSegment === "llm-tracing") {
      const params = new URLSearchParams(location.search);
      const selectedTab = params.get("selectedTab");
      const tab = params.get("tab");
      // If it's a custom view tab, keep it
      if (tab && tab.startsWith("view-")) return;
      // Otherwise derive from selectedTab param
      if (selectedTab === "spans") {
        setActiveTab("spans");
      } else if (!tab || tab === "traces") {
        setActiveTab("traces");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRouteSegment]);

  // Handle tab change from ObserveTabBar
  const handleTabChange = useCallback(
    (tabKey) => {
      setActiveTab(tabKey);

      // Set activeViewConfig from saved view data
      if (tabKey.startsWith("view-")) {
        const viewId = tabKey.replace("view-", "");
        const view = (
          savedViewsData?.customViews ?? savedViewsData?.custom_views
        )?.find((v) => v.id === viewId);
        setActiveViewConfig(view?.config || null);
      } else {
        setActiveViewConfig(null);
      }

      // Navigate to the appropriate route
      if (tabKey.startsWith("view-")) {
        const basePath = `/dashboard/observe/${observeId}/llm-tracing`;
        navigate(`${basePath}?tab=${tabKey}&selectedTab=trace`, {
          replace: true,
        });
      } else {
        const config = TAB_TO_ROUTE[tabKey];
        if (config) {
          const basePath = `/dashboard/observe/${observeId}/${config.route}`;
          const params = new URLSearchParams();
          params.set("tab", tabKey);
          Object.entries(config.params).forEach(([k, v]) => params.set(k, v));
          navigate(`${basePath}?${params.toString()}`, { replace: true });
        }
      }
    },
    [
      observeId,
      navigate,
      setActiveTab,
      savedViewsData?.customViews ?? savedViewsData?.custom_views,
      setActiveViewConfig,
    ],
  );

  // Legacy tabs for non-tab-system routes (sessions, evals, charts, etc.)
  const legacyTabs = useMemo(
    () => [
      {
        id: "llm-tracing",
        title: "LLM Tracing",
        path: `/dashboard/observe/${observeId}/llm-tracing`,
        show: true,
      },
      {
        id: "evals-tasks",
        title: "Evals & Tasks",
        path: `/dashboard/observe/${observeId}/evals-tasks`,
        show: true,
      },
      {
        id: "charts",
        title: "Charts",
        path: `/dashboard/observe/${observeId}/charts`,
        show: true,
      },
      {
        id: "alerts",
        title: "Alerts",
        path: `/dashboard/observe/${observeId}/alerts`,
        show: true,
      },
    ],
    [observeId],
  );

  const currentLegacyTab = useMemo(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    return legacyTabs.find((tab) => segments.includes(tab.id)) || legacyTabs[0];
  }, [location.pathname, legacyTabs]);

  const handleLegacyTabChange = useCallback(
    (event, newTabId) => {
      const selectedTab = legacyTabs.find((tab) => tab.id === newTabId);
      if (selectedTab && selectedTab.path !== location.pathname) {
        navigate(selectedTab.path, { replace: true });
      }
    },
    [legacyTabs, location.pathname, navigate],
  );

  // Memoized styles
  const containerStyles = useMemo(
    () => ({
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      backgroundColor: "background.paper",
    }),
    [],
  );

  const headerPaperStyles = useMemo(
    () => ({
      paddingX: theme.spacing(2),
      paddingTop: theme.spacing(2),
      borderRadius: 0,
      boxShadow: "none",
      backgroundColor: "background.paper",
      flexShrink: 0,
    }),
    [theme],
  );

  const tabsPaperStyles = useMemo(
    () => ({
      paddingX: theme.spacing(2),
      paddingTop: theme.spacing(0.5),
      paddingBottom: theme.spacing(0.5),
      boxShadow: "none",
      backgroundColor: "background.paper",
      flexShrink: 0,
    }),
    [theme],
  );

  const contentStyles = useMemo(
    () => ({
      flex: 1,
      overflow: "auto",
      backgroundColor: "background.paper",
    }),
    [],
  );

  useEffect(() => {
    return () => {
      resetReplaySessionsStore();
      resetSessionsGridStore();
      resetTraceGridStore();
      resetTabStore();
      headerConfig?.gridApi?.deselectAll();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observeId]);

  if (!observeId) {
    return (
      <Box sx={{ p: 3, backgroundColor: "background.paper" }}>
        <Alert severity="error">
          Invalid observe ID. Please check the URL and try again.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={containerStyles}>
      {/* Header Section */}
      <Paper sx={headerPaperStyles}>
        <ObserveHeader
          text={headerConfig.text}
          filterTrace={headerConfig.filterTrace}
          filterSpan={headerConfig.filterSpan}
          selectedTab={headerConfig.selectedTab}
          filterSession={headerConfig.filterSession}
          refreshData={headerConfig.refreshData}
          resetFilters={headerConfig.resetFilters}
        />
      </Paper>

      {/* Tabs Section */}
      <Paper sx={tabsPaperStyles}>
        {isTabSystemRoute ? (
          <ObserveTabBar
            projectId={observeId}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            projectSource={projectDetail?.source}
          />
        ) : (
          <ObserveTabs
            tabs={legacyTabs}
            currentTab={currentLegacyTab}
            onTabChange={handleLegacyTabChange}
            observeId={observeId}
          />
        )}
      </Paper>

      {/* Filter chips slot — FilterChips portals here */}
      <Box
        id="observe-filter-chips-slot"
        sx={{ px: 2, flexShrink: 0, bgcolor: "background.paper" }}
      />

      {/* Content Section */}
      <Box sx={contentStyles}>
        <TabErrorBoundary>
          <Outlet />
        </TabErrorBoundary>
      </Box>
      <ReplayDrawer
        gridApi={headerConfig?.gridApi}
        currentTab={currentLegacyTab}
        projectDetail={projectDetail}
      />

      {/* View config modal (create / edit) */}
      <ViewConfigModal
        open={createModalOpen}
        onClose={closeCreateModal}
        mode={editModalView ? "edit" : "create"}
        initialValues={editModalView}
        projectId={observeId}
        onSuccess={(newView) => {
          if (newView?.id) {
            handleTabChange(`view-${newView.id}`);
          }
        }}
      />

      {/* Tab context menu (right-click on custom view tabs) */}
      {contextMenuAnchor && (
        <TabContextMenu
          anchorPosition={contextMenuAnchor}
          view={
            (savedViewsData?.customViews ?? savedViewsData?.custom_views)?.find(
              (v) => v.id === contextMenuAnchor.viewId,
            ) ?? null
          }
          projectId={observeId}
          onClose={closeContextMenu}
          onRename={startRenaming}
          onTabChange={handleTabChange}
        />
      )}
    </Box>
  );
});

ObservePage.displayName = "ObservePage";

export default ObservePage;
