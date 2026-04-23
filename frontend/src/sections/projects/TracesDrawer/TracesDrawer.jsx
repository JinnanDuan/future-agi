import React from "react";
import {
  Box,
  Drawer,
  Typography,
  Chip,
  useTheme,
  // Tabs and Tab hidden for now - only one tab exists currently
  // Tabs,
  // Tab,
  Skeleton,
} from "@mui/material";
import PropTypes from "prop-types";
import Iconify from "src/components/iconify";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";
import { useScrollEnd } from "src/hooks/use-scroll-end";

import SessionHistory from "./SessionHistory";
import logger from "src/utils/logger";
import { format, parseISO } from "date-fns";
// SvgColor used by Tabs - hidden for now
// import SvgColor from "src/components/svg-color";
import Header from "./Header";
import Filters from "./Filters";
import { useParams } from "react-router";
import { useTraceDrawerStore } from "./useTraceDrawerStore";
import { formatMs } from "src/utils/utils";
import InlineAnnotator from "src/components/InlineAnnotator";

/* CustomTabPanel and a11yProps hidden - only one tab exists currently.
   Uncomment when more tabs are added.

const CustomTabPanel = React.forwardRef((props, ref) => {
  const { children, value, index, ...other } = props;

  return (
    <Box
      ref={ref}
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </Box>
  );
});

CustomTabPanel.displayName = "CustomTabPanel";

CustomTabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    "aria-controls": `simple-tabpanel-${index}`,
  };
}
*/

const TracesDrawer = ({ open, onClose, rowData }) => {
  const theme = useTheme();
  const { projectId, observeId } = useParams();
  const projectIdToUse = projectId || observeId;
  const sessionId = rowData?.session_id;
  const [currentSessionId, setCurrentSessionId] = React.useState(null);
  const [navigationDirection, setNavigationDirection] = React.useState(null);
  const { viewType, setViewType } = useTraceDrawerStore();

  const activeSessionId = currentSessionId || sessionId;

  const {
    data: _traceDetail,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    isFetching,
  } = useInfiniteQuery({
    queryKey: ["traceSession", activeSessionId],
    queryFn: ({ pageParam }) => {
      return axios.get(`${endpoints.project.traceSession}${activeSessionId}/`, {
        params: { page_number: pageParam, page_size: 10 },
      });
    },
    getNextPageParam: (page, _, pageParams) => {
      return page.data?.result?.next ? pageParams + 1 : null;
    },
    initialPageParam: 0,
    enabled: Boolean(activeSessionId),
  });

  const scrollRef = useScrollEnd(() => {
    if (isFetchingNextPage || isLoading) {
      return;
    }
    fetchNextPage();
  }, [isFetchingNextPage, isLoading]);

  const sessionMetadata =
    _traceDetail?.pages[0]?.data?.result?.session_metadata;
  const traceDetail =
    _traceDetail?.pages?.reduce((acc, page) => {
      logger.debug({ page });
      return [...acc, ...page.data.result.response];
    }, []) || [];

  const handleTraceNavigation = (direction) => {
    const sessionIdKey =
      direction === "next" ? "next_session_id" : "previous_session_id";
    const targetId = sessionMetadata?.[sessionIdKey];

    if (targetId) {
      setNavigationDirection(direction);
      setCurrentSessionId(targetId);
    }
  };

  const hasNextTrace = Boolean(sessionMetadata?.next_session_id);
  const hasPrevTrace = Boolean(sessionMetadata?.previous_session_id);

  const handleClose = () => {
    onClose();
    setCurrentSessionId(null);
    setNavigationDirection(null);
  };

  // Separate loading states
  const isInitialLoading = isLoading && !_traceDetail;
  const isNavigationLoading =
    isFetching && !isFetchingNextPage && !sessionMetadata;
  const isNextLoading = isNavigationLoading && navigationDirection === "next";
  const isPrevLoading = isNavigationLoading && navigationDirection === "prev";

  React.useEffect(() => {
    if (!isFetching && navigationDirection) {
      setNavigationDirection(null);
    }
  }, [isFetching, navigationDirection]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={handleClose}
      BackdropProps={{ invisible: true }}
      sx={{
        width: "97.5vw",
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: "97.5vw",
          backgroundColor: "background.paper",
          padding: 2,
        },
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,

            zIndex: 10,
            pb: 1.5,
          }}
        >
          <Header
            hasNextTrace={hasNextTrace}
            hasPrevTrace={hasPrevTrace}
            handleNextTrace={() => handleTraceNavigation("next")}
            handlePrevTrace={() => handleTraceNavigation("prev")}
            onClose={handleClose}
            rowData={sessionMetadata}
            isNextLoading={isNextLoading}
            isPrevLoading={isPrevLoading}
          />
          <Box display="flex" gap={1}>
            {isInitialLoading || isNextLoading || isPrevLoading ? (
              <>
                <Skeleton
                  variant="rounded"
                  width={150}
                  height={25}
                  sx={{ borderRadius: "8px" }}
                />
                <Skeleton
                  variant="rounded"
                  width={130}
                  height={25}
                  sx={{ borderRadius: "8px" }}
                />
                <Skeleton
                  variant="rounded"
                  width={140}
                  height={25}
                  sx={{ borderRadius: "8px" }}
                />
                <Skeleton
                  variant="rounded"
                  width={180}
                  height={25}
                  sx={{ borderRadius: "8px" }}
                />
              </>
            ) : (
              <>
                <Chip
                  label={
                    <Typography
                      variant="s2"
                      sx={{ color: "text.primary" }}
                      fontWeight={"fontWeightRegular"}
                    >
                      Total Duration:{" "}
                      {sessionMetadata?.duration
                        ? formatMs(sessionMetadata.duration * 1000)
                        : "N/A"}
                    </Typography>
                  }
                  icon={<Iconify icon="radix-icons:clock" width={14} />}
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.default",
                    color: "text.secondary",
                    height: "25px",
                    paddingX: 0.5,
                    borderRadius: "8px",
                    "& .MuiChip-icon": {
                      color:
                        theme.palette.mode === "light"
                          ? "text.primary"
                          : "text.secondary",
                    },
                    "&:hover": {
                      backgroundColor: "background.paper",
                      borderColor: "divider",
                    },
                  }}
                />
                <Chip
                  label={
                    <Typography
                      typography="s2"
                      sx={{ color: "text.primary" }}
                      fontWeight={"fontWeightRegular"}
                    >
                      Total Cost:{" "}
                      {sessionMetadata?.total_cost
                        ? `${sessionMetadata.total_cost}`
                        : "N/A"}
                    </Typography>
                  }
                  icon={
                    <img
                      src={`/assets/icons/ic_dollar.svg`}
                      alt="Coins Icon"
                      style={{
                        width: 15,
                        height: 15,
                      }}
                    />
                  }
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.default",
                    color: "text.secondary",
                    height: "25px",
                    paddingX: 0.5,
                    borderRadius: "8px",
                    "& .MuiChip-icon": {
                      filter:
                        theme.palette.mode === "light"
                          ? "none"
                          : "invert(1) brightness(0.9)",
                    },
                    "&:hover": {
                      backgroundColor: "background.paper",
                      borderColor: "divider",
                    },
                  }}
                />
                <Chip
                  label={
                    <Typography
                      variant="s2"
                      sx={{ color: "text.primary" }}
                      fontWeight={"fontWeightRegular"}
                    >
                      Total Traces:{" "}
                      {sessionMetadata?.total_traces
                        ? sessionMetadata.total_traces
                        : "N/A"}
                    </Typography>
                  }
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.default",
                    color: "text.secondary",
                    height: "25px",
                    paddingX: 0.5,
                    borderRadius: "8px",
                    "&:hover": {
                      backgroundColor: "background.paper",
                      borderColor: "divider",
                    },
                  }}
                />
                <Chip
                  label={
                    <Typography
                      variant="s2"
                      sx={{ color: "text.primary" }}
                      fontWeight={"fontWeightRegular"}
                    >
                      Started:{" "}
                      {sessionMetadata?.start_time
                        ? format(
                            parseISO(sessionMetadata.start_time),
                            "dd/MM/yyyy - HH:mm",
                          )
                        : "N/A"}
                    </Typography>
                  }
                  sx={{
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.default",
                    color: "text.secondary",
                    height: "25px",
                    paddingX: 0.5,
                    borderRadius: "8px",
                    "&:hover": {
                      backgroundColor: "background.paper",
                      borderColor: "divider",
                    },
                  }}
                />
              </>
            )}
          </Box>
          {/* Tabs hidden - only one tab (Session History) exists currently.
              Uncomment when more tabs are added. */}
          {/* <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
            <Tabs
              value={value}
              onChange={handleChange}
              aria-label="basic tabs example"
              textColor="primary"
              indicatorColor="primary"
              sx={{
                typography: "s2",
                "& .Mui-selected": {
                  color: "primary.main",
                  fontWeight: "fontWeightSemiBold",
                },
                "& .MuiTabs-indicator": {
                  backgroundColor: "primary.main",
                },
                "& .MuiTab-root": {
                  paddingX: 1.75,
                },
              }}
            >
              <Tab
                icon={
                  <SvgColor
                    sx={{
                      bgcolor: "primary.main",
                      height: "16px",
                      width: "16px",
                    }}
                    src={"/assets/icons/ic_message.svg"}
                  />
                }
                label="Session History"
                {...a11yProps(0)}
              />
            </Tabs>
          </Box> */}
          <Box sx={{ px: 1, maxHeight: "50vh", overflowY: "auto" }}>
            <InlineAnnotator
              sourceType="trace_session"
              sourceId={activeSessionId}
              projectId={projectIdToUse}
              compact
            />
          </Box>
          <Filters viewType={viewType} setViewType={setViewType} />
        </Box>
        <Box
          sx={{
            flex: 1,
            overflow: "auto",
          }}
          ref={scrollRef}
        >
          <SessionHistory
            traceDetail={traceDetail}
            loading={isInitialLoading}
            isFetchingNextPage={isFetchingNextPage}
            activeSessionId={activeSessionId}
          />
        </Box>
      </Box>
    </Drawer>
  );
};

TracesDrawer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  rowData: PropTypes.object,
};

export default TracesDrawer;
