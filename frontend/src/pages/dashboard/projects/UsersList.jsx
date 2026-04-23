import React, { useCallback, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Box, Divider, Paper, Typography, useTheme } from "@mui/material";
import Iconify from "src/components/iconify";
import UsersView from "src/sections/projects/UsersView/UsersView";
import UsersPageTabBar from "src/sections/projects/UsersView/UsersPageTabBar";

// Top-level "Users" page at /dashboard/users.
//
// Wraps UsersView in the same Paper-based chrome ObservePage uses so the
// page reads as a first-class dashboard page (header bar with title +
// description, dedicated toolbar slot, filter chips slot, scrollable
// content area). Without this, UsersView's ObserveToolbar would fall back
// to inline render and the page looks unfinished.
const UserList = () => {
  const theme = useTheme();

  // Saved-view api ref populated by UsersView on mount. Drives the tab bar.
  const savedViewApiRef = useRef(null);
  const [activeTab, setActiveTab] = useState("all");

  // Stable handles — the ref indirection makes empty-deps safe.
  const getSavedViewConfig = useCallback(
    () => savedViewApiRef.current?.getConfig?.() ?? {},
    [],
  );
  const applySavedViewConfig = useCallback(
    (cfg) => savedViewApiRef.current?.applyConfig?.(cfg),
    [],
  );

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

  return (
    <>
      <Helmet>
        <title>Users</title>
      </Helmet>
      <Box sx={containerStyles}>
        {/* === Header === */}
        <Paper sx={headerPaperStyles}>
          <Box display="flex" flexDirection="column" width="100%">
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              sx={{ minHeight: 38 }}
            >
              <Box display="flex" alignItems="center" gap={1.5}>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    height: 26,
                    px: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: "4px",
                    bgcolor: "background.paper",
                  }}
                >
                  <Iconify
                    icon="mdi:account-multiple-outline"
                    width={16}
                    sx={{ color: "text.secondary" }}
                  />
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 600, color: "text.primary" }}
                  >
                    Users
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  sx={{ color: "text.secondary", ml: 0.5 }}
                >
                  All users across your projects
                </Typography>
              </Box>
            </Box>
            <Divider sx={{ mt: 1.5, borderColor: "divider" }} />
          </Box>
        </Paper>

        {/* === Tab bar + toolbar slot — UsersView's ObserveToolbar portals into the right slot === */}
        <Paper sx={tabsPaperStyles}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              minHeight: 36,
              gap: 1,
            }}
          >
            <UsersPageTabBar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              getConfig={getSavedViewConfig}
              applyConfig={applySavedViewConfig}
            />
            <Box
              id="observe-toolbar-slot"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexShrink: 0,
              }}
            />
          </Box>
        </Paper>

        {/* Filter chips slot — FilterChips portals here */}
        <Box
          id="observe-filter-chips-slot"
          sx={{ px: 2, flexShrink: 0, bgcolor: "background.paper" }}
        />

        {/* Content */}
        <Box sx={contentStyles}>
          <UsersView savedViewApiRef={savedViewApiRef} />
        </Box>
      </Box>
    </>
  );
};

export default UserList;
