import React from "react";
import PropTypes from "prop-types";
import { Box, Tab, Tabs, useTheme } from "@mui/material";
import { trackEvent, Events, PropertyName } from "src/utils/Mixpanel";

import { useNavData } from "./ConfigNavData";

const ObserveTabsComponent = ({ tabs, currentTab, onTabChange, observeId }) => {
  const theme = useTheme();
  const navData = useNavData();

  // Get all tabs with icons from navData
  const allTabs = navData?.flatMap((section) => section.items) || [];

  const handleTabChange = React.useCallback(
    (event, newTabId) => {
      // Track tab selection
      const selectedTab = tabs.find((tab) => tab.id === newTabId);
      if (selectedTab) {
        const tabEvent = Events.observeTabsClicked[newTabId];

        if (tabEvent) {
          trackEvent(tabEvent, {
            [PropertyName.id]: observeId,
          });
        }
      }
      onTabChange(event, newTabId);
    },
    [tabs, onTabChange, observeId],
  );

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Tabs
        value={currentTab?.id || tabs[0]?.id}
        onChange={handleTabChange}
        textColor="primary"
        TabIndicatorProps={{
          style: {
            backgroundColor: theme.palette.primary.main,
          },
        }}
        sx={{
          minHeight: 42,
          fontSize: 14,
          "& .MuiTabs-flexContainer": {
            gap: 0,
          },
          "& .MuiTab-root": {
            minHeight: 42,
            paddingX: theme.spacing(1.5),
            margin: theme.spacing(0),
            marginRight: theme.spacing(0) + "!important",
            minWidth: "auto",
            fontWeight: "fontWeightMedium",
            typography: "s1",
            color: "text.disabled",
            textTransform: "none",
            transition: theme.transitions.create(
              ["color", "background-color"],
              {
                duration: theme.transitions.duration.short,
              },
            ),
            "&.Mui-selected": {
              color: "primary.main",
              fontWeight: "fontWeightSemiBold",
            },
            "&:not(.Mui-selected)": {
              color: `${theme.palette.text.secondary}`,
            },
            "&:first-of-type": {
              marginLeft: 0,
            },
          },
        }}
      >
        {tabs
          .filter((tab) => tab.show)
          .map((tab) => {
            // Find matching tab from navData to get icon
            const navTab = allTabs.find(
              (navItem) =>
                navItem.path.includes(tab.id) ||
                navItem.title.toLowerCase().includes(tab.id.replace("-", " ")),
            );

            return (
              <Tab
                key={tab.id}
                label={tab.title}
                value={tab.id}
                icon={navTab?.icon}
              />
            );
          })}
      </Tabs>
    </Box>
  );
};

ObserveTabsComponent.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      path: PropTypes.string.isRequired,
    }),
  ).isRequired,
  currentTab: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    path: PropTypes.string.isRequired,
  }),
  onTabChange: PropTypes.func.isRequired,
  observeId: PropTypes.string.isRequired,
};

const ObserveTabs = React.memo(ObserveTabsComponent);
ObserveTabs.displayName = "ObserveTabs";

export default ObserveTabs;
