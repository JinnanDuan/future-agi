import { Box, Stack, Typography, useTheme } from "@mui/material";
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import BackButton from "../../../sections/develop-detail/Common/BackButton";
import DetailAction from "src/components/feed/DetailAction";
import ColumnChartContainer from "src/components/feed/ColumnChartContainer";
import FeedRightSection from "src/components/feed/FeedRightSection";
import { useFeedDetails } from "./hooks";
import InsightsAndTraces from "src/components/feed/InsightsAndTraces";
import { useFeedDetailStore } from "./store/store";
import { SelectedNodeProvider } from "src/components/traceDetailDrawer/selectedNodeContext";
import FeedSkeleton from "./FeedSkeleton";
import { useQuery } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";

export default function FeedDetailView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();
  const { data: feedDetails, isPending: isPendingFeedDetails } =
    useFeedDetails(id);
  const { setCurrentTraceId, setErrorName } = useFeedDetailStore();

  useEffect(() => {
    if (!isPendingFeedDetails) {
      setCurrentTraceId(feedDetails?.traceNavigation?.current);
    }
  }, [setCurrentTraceId, isPendingFeedDetails, feedDetails?.traceNavigation]);

  useEffect(() => {
    if (feedDetails?.errorName) {
      setErrorName(feedDetails.errorName);
    }
  }, [feedDetails, setErrorName]);

  const handleBackClick = () => {
    const previousPath = location.state?.from;
    const currentPath = location.pathname;
    const currentBaseSection = currentPath.split("/").slice(0, 3).join("/");

    if (previousPath && previousPath.startsWith(currentBaseSection)) {
      navigate(-1);
    } else {
      navigate(`/dashboard/feed`);
    }
  };

  const { data: _clusterOptions } = useQuery({
    queryKey: ["cluster-list"],
    queryFn: () => axios.get(endpoints.feed.getFeed),
    select: (res) => {
      return res?.data?.result?.clusters?.map((cluster) => ({
        label: cluster.error?.name,
        value: cluster.clusterId,
      }));
    },
    enabled: false,
  });
  // console.log(clusterOptions);

  return (
    <Box
      sx={{
        padding: theme.spacing(2),
        bgcolor: "background.paper",
        display: "flex",
        flex: 1,
      }}
    >
      <Stack direction={"row"} width={"100%"}>
        {isPendingFeedDetails ? (
          <FeedSkeleton />
        ) : (
          <Stack
            direction={"column"}
            gap={theme.spacing(2)}
            sx={{
              display: "flex",
              flex: 1,
              overflowY: "auto",
            }}
          >
            <Stack
              direction={"row"}
              alignItems={"center"}
              gap={theme.spacing(2)}
            >
              <BackButton onBack={handleBackClick} />
              <Box
                sx={{
                  padding: theme.spacing(0.5, 1.5),
                  border: "1px solid",
                  borderColor: "action.hover",
                  borderRadius: theme.spacing(0.5),
                }}
              >
                <Typography
                  typography={"s1"}
                  color={"text.primary"}
                  fontWeight={"fontWeightRegular"}
                >
                  {feedDetails?.errorName}
                </Typography>
              </Box>
            </Stack>
            <Stack gap={0}>
              <Typography
                typography={"m3"}
                color={"text.primary"}
                fontWeight={"fontWeightMedium"}
              >
                {feedDetails?.errorName}
              </Typography>
              <Stack direction={"row"} gap={0.5} alignItems={"center"}>
                <Box
                  sx={{
                    height: 4,
                    width: 4,
                    borderRadius: "50%",
                    bgcolor: "orange.500",
                  }}
                />
                <Typography
                  typography={"s2"}
                  fontWeight={"fontWeightRegular"}
                  color={"text.disabled"}
                >
                  {feedDetails?.errorType}
                </Typography>
              </Stack>
            </Stack>
            <DetailAction feedDetails={feedDetails} />
            <ColumnChartContainer
              trends={feedDetails?.trends}
              users={feedDetails?.users}
              events={feedDetails?.events}
            />
            <SelectedNodeProvider>
              <InsightsAndTraces />
            </SelectedNodeProvider>
            {/* <ScoresSection />
              <TraceSpanSection />
              <EventGroupingInfo /> */}
          </Stack>
        )}

        <FeedRightSection
          sx={{
            width: "280px",
          }}
          priority={feedDetails?.impact?.toLowerCase()}
          assignee={["Jane Doe", "John Doe"]}
          lastSeenHuman={feedDetails?.lastSeenHuman}
          firstSeenHuman={feedDetails?.firstSeenHuman}
        />
      </Stack>
    </Box>
  );
}
