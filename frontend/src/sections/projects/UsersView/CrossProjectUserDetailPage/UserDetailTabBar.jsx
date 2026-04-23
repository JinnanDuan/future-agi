import React, {
  useCallback,
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import PropTypes from "prop-types";
import { Box, ButtonBase, Divider } from "@mui/material";
import { enqueueSnackbar } from "notistack";

import Iconify from "src/components/iconify";
import CustomTooltip from "src/components/tooltip/CustomTooltip";
import FixedTab from "src/components/observe-tabs/FixedTab";
import CustomViewTab from "src/components/observe-tabs/CustomViewTab";
import SaveViewPopover from "src/components/traceDetail/SaveViewDialog";
import {
  useGetWorkspaceSavedViews,
  useCreateWorkspaceSavedView,
  useUpdateWorkspaceSavedView,
  useDeleteWorkspaceSavedView,
} from "src/api/project/saved-views";

const USER_DETAIL_TAB_TYPE = "user_detail";

const FIXED_TABS = [
  {
    key: "sessions",
    label: "Sessions",
    icon: "mdi:account-group-outline",
    shortcut: "1",
  },
  {
    key: "traces",
    label: "Trace",
    icon: "mdi:link-variant",
    shortcut: "2",
  },
];

// Cross-project user-detail page tab bar.
// - Fixed tabs: Sessions, Traces
// - Custom workspace-saved views (personal) whose config captures the active
//   subTab + filter/display state so clicking one jumps to that subTab and
//   restores its config via the parent's imperative api refs.
const UserDetailTabBar = ({
  activeTab,
  onTabChange,
  getConfigFor,
  applyConfigFor,
}) => {
  const { data: savedViewsData } =
    useGetWorkspaceSavedViews(USER_DETAIL_TAB_TYPE);
  const customViews = useMemo(
    () => savedViewsData?.customViews ?? savedViewsData?.custom_views ?? [],
    [savedViewsData],
  );

  const { mutate: createSavedView } =
    useCreateWorkspaceSavedView(USER_DETAIL_TAB_TYPE);
  const { mutate: updateSavedView } =
    useUpdateWorkspaceSavedView(USER_DETAIL_TAB_TYPE);
  const { mutate: deleteSavedView } =
    useDeleteWorkspaceSavedView(USER_DETAIL_TAB_TYPE);

  const [saveViewAnchor, setSaveViewAnchor] = useState(null);
  const [isSavingView, setIsSavingView] = useState(false);
  const [renamingId, setRenamingId] = useState(null);

  // Apply config only on real tab transitions — React Query refetches would
  // otherwise stomp in-progress state.
  const lastAppliedTabRef = useRef(null);

  useEffect(() => {
    if (lastAppliedTabRef.current === activeTab) return;

    // Fixed tab (sessions/traces): reset that sub-tab's state to defaults
    if (FIXED_TABS.some((t) => t.key === activeTab)) {
      lastAppliedTabRef.current = activeTab;
      applyConfigFor?.(activeTab, null);
      return;
    }

    // Custom view
    const id = activeTab?.startsWith?.("view-") ? activeTab.slice(5) : null;
    if (!id) {
      lastAppliedTabRef.current = activeTab;
      return;
    }
    const view = customViews.find((v) => v.id === id);
    if (view?.config) {
      const subTab = view.config.sub_tab || view.config.subTab || "sessions";
      // Push the sub-tab switch up to the parent
      onTabChange?.(activeTab, subTab);
      applyConfigFor?.(subTab, view.config);
      lastAppliedTabRef.current = activeTab;
    }
    // If not found yet — retry once customViews loads
  }, [activeTab, applyConfigFor, onTabChange, customViews]);

  const handleSaveViewConfirm = useCallback(
    (name) => {
      setIsSavingView(true);
      // We save the currently-active sub-tab's config. activeTab may itself
      // be a custom view — in that case fall back to its underlying sub_tab.
      let targetSubTab = null;
      if (FIXED_TABS.some((t) => t.key === activeTab)) {
        targetSubTab = activeTab;
      } else {
        const id = activeTab?.startsWith?.("view-") ? activeTab.slice(5) : null;
        const view = id ? customViews.find((v) => v.id === id) : null;
        targetSubTab =
          view?.config?.sub_tab || view?.config?.subTab || "sessions";
      }
      const inner = getConfigFor?.(targetSubTab) || {};
      const config = { ...inner, sub_tab: targetSubTab };
      createSavedView(
        { name, config },
        {
          onSuccess: (res) => {
            enqueueSnackbar("View created", { variant: "success" });
            const newId = res?.data?.result?.id;
            if (newId) onTabChange?.(`view-${newId}`, targetSubTab);
            setSaveViewAnchor(null);
            setIsSavingView(false);
          },
          onError: () => {
            enqueueSnackbar("Failed to create view", { variant: "error" });
            setIsSavingView(false);
          },
        },
      );
    },
    [activeTab, customViews, createSavedView, getConfigFor, onTabChange],
  );

  const handleClose = useCallback(
    (viewId) => {
      deleteSavedView(viewId, {
        onSuccess: () => {
          if (activeTab === `view-${viewId}`) {
            onTabChange?.("sessions", "sessions");
          }
        },
      });
    },
    [deleteSavedView, activeTab, onTabChange],
  );

  const handleRenameSubmit = useCallback(
    (viewId, newName) => {
      updateSavedView({ id: viewId, name: newName });
      setRenamingId(null);
    },
    [updateSavedView],
  );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        minHeight: 36,
        gap: 1,
        flex: 1,
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flexShrink: 0,
        }}
      >
        {FIXED_TABS.map((tab) => (
          <FixedTab
            key={tab.key}
            tabKey={tab.key}
            label={tab.label}
            icon={tab.icon}
            shortcut={tab.shortcut}
            isActive={activeTab === tab.key}
            onClick={(key) => onTabChange?.(key, key)}
          />
        ))}
      </Box>

      {customViews.length > 0 && (
        <Divider
          orientation="vertical"
          flexItem
          sx={{ mx: 0.5, my: 1, borderColor: "divider", flexShrink: 0 }}
        />
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          flex: 1,
          minWidth: 0,
          overflowX: "auto",
          overflowY: "hidden",
          scrollbarWidth: "thin",
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: "divider",
            borderRadius: 3,
          },
        }}
      >
        {customViews.map((view, idx) => (
          <CustomViewTab
            key={`view-${view.id}`}
            view={view}
            shortcut={idx + 3 <= 9 ? String(idx + 3) : undefined}
            isActive={activeTab === `view-${view.id}`}
            isRenaming={renamingId === view.id}
            onClick={(key) => {
              const subTab =
                view.config?.sub_tab || view.config?.subTab || "sessions";
              onTabChange?.(key, subTab);
            }}
            onClose={handleClose}
            onContextMenu={(x, y, id) => setRenamingId(id)}
            onRenameSubmit={handleRenameSubmit}
            onRenameCancel={() => setRenamingId(null)}
          />
        ))}
      </Box>

      <CustomTooltip
        show
        title="Save current view"
        placement="bottom"
        arrow
        size="small"
        type="black"
      >
        <ButtonBase
          onClick={(e) => setSaveViewAnchor(e.currentTarget)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            height: 26,
            width: 26,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "4px",
            bgcolor: "background.paper",
            flexShrink: 0,
            "&:hover": { bgcolor: "background.neutral" },
          }}
        >
          <Iconify icon="mdi:plus" width={16} sx={{ color: "text.primary" }} />
        </ButtonBase>
      </CustomTooltip>

      <SaveViewPopover
        anchorEl={saveViewAnchor}
        open={Boolean(saveViewAnchor)}
        onClose={() => setSaveViewAnchor(null)}
        onSave={handleSaveViewConfirm}
        isLoading={isSavingView}
      />
    </Box>
  );
};

UserDetailTabBar.propTypes = {
  activeTab: PropTypes.string.isRequired,
  onTabChange: PropTypes.func.isRequired,
  getConfigFor: PropTypes.func.isRequired,
  applyConfigFor: PropTypes.func.isRequired,
};

export default UserDetailTabBar;
