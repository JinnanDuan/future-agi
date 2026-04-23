import React, { useState } from "react";
import { useFeedDetailStore } from "src/pages/dashboard/feed/store/store";
import { useQuery } from "@tanstack/react-query";
import axios, { endpoints } from "src/utils/axios";
import TraceTree from "src/components/traceDetailDrawer/trace-tree";
// import { columnOptions } from '../common';
import { Box, Divider, Grid, Stack, Typography } from "@mui/material";
import ErrorAnalysis from "src/components/traceDetailDrawer/ErrorAnalysis";
import { ShowComponent } from "src/components/show";
import { columnOptions } from "src/components/feed/common";
import { useSettingsContext } from "src/components/settings";
import { useSelectedNode } from "src/components/traceDetailDrawer/useSelectedNode";
import BottomAttributesTab from "../traceDetailDrawer/bottom-attributes-tab";
import HeadingAndSubheading from "../HeadingAndSubheading/HeadingAndSubheading";
import TraceDetailDrawer from "../traceDetailDrawer/trace-detail-drawer";
import { format, isValid } from "date-fns";

const InsightsAndTraces = () => {
  const { currentTraceId } = useFeedDetailStore();
  const { themeLayout } = useSettingsContext();
  const { selectedNode } = useSelectedNode();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { data: traceDetail, isLoading } = useQuery({
    queryKey: ["trace-detail", currentTraceId],
    queryFn: () => {
      return axios.get(endpoints.project.getTrace(currentTraceId));
    },
    select: (data) => data.data?.result,
    enabled: !!currentTraceId,
  });

  const handleTraceNodeSelect = () => {
    setIsDrawerOpen(true);
  };

  const rawStartTime = selectedNode?.start_time ?? selectedNode?.startTime;
  const startTime = new Date(rawStartTime);

  const formattedStartTime = isValid(startTime)
    ? format(startTime, "MMM dd, yyyy, hh:mm a")
    : "Invalid Date";

  return (
    <>
      <Stack gap={2}>
        <ShowComponent condition={!isLoading && currentTraceId !== null}>
          <ErrorAnalysis
            traceId={currentTraceId}
            traceDetail={traceDetail}
            defaultExpanded={true}
          />
        </ShowComponent>
        <Grid
          container
          direction={"row"}
          sx={{
            flexDirection: "row",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            padding: 2,
            paddingRight: 0,
          }}
        >
          <Grid item xs={themeLayout === "vertical" ? 7 : 6}>
            <Box
              sx={{
                height: "100%",
                overflowY: "auto",
                borderRadius: 0,
                display: "flex",
                flexDirection: "column",
                gap: 2,
                "&::-webkit-scrollbar-track": {
                  backgroundColor: "transparent",
                },
                backgroundColor: "background.paper",
              }}
            >
              <Typography
                typography="m3"
                sx={{ fontWeight: 600, mt: 2, ml: 2 }}
              >
                Trace Details
              </Typography>
              <Box>
                <TraceTree
                  treeData={traceDetail?.observation_spans || []}
                  defaultSelectedSpanId={
                    selectedNode?.id ||
                    traceDetail?.observation_spans?.[0]?.observation_span?.id
                  }
                  columnOptionItems={columnOptions}
                  onTraceNodeSelect={handleTraceNodeSelect}
                />
              </Box>
            </Box>
          </Grid>
          <Grid item>
            <Divider orientation="vertical" />
          </Grid>
          <Grid
            item
            xs={themeLayout === "vertical" ? 4.9 : 5.5}
            p={2}
            pr={1}
            display={"flex"}
            flexDirection={"column"}
            gap={2}
          >
            <Typography typography="m3" fontWeight="fontWeightSemiBold">
              Span Details
            </Typography>
            <Stack direction="column" spacing={2}>
              {/* First row: Id and Project Id */}
              <Stack direction="row" spacing={4}>
                <Box flex="1">
                  <HeadingAndSubheading
                    heading={
                      <Typography typography="s2_1" color="text.disabled">
                        ID
                      </Typography>
                    }
                    subHeading={
                      <Typography
                        typography="s2_1"
                        fontWeight="fontWeightMedium"
                        color="text.primary"
                        wordBreak="break-word"
                      >
                        {selectedNode?.id}
                      </Typography>
                    }
                  />
                </Box>

                <Box flex="1">
                  <HeadingAndSubheading
                    heading={
                      <Typography typography="s2_1" color="text.disabled">
                        Project ID
                      </Typography>
                    }
                    subHeading={
                      <Typography
                        typography="s2_1"
                        color="text.primary"
                        fontWeight="fontWeightMedium"
                        wordBreak="break-word"
                      >
                        {traceDetail?.trace?.project}
                      </Typography>
                    }
                  />
                </Box>
              </Stack>

              {/* Second row: Start and Duration */}
              <Stack direction="row" spacing={4}>
                {selectedNode?.start_time ?? selectedNode?.startTime ? (
                  <>
                    <Box flex="1">
                      <HeadingAndSubheading
                        heading={
                          <Typography typography="s2_1" color="text.disabled">
                            Start
                          </Typography>
                        }
                        subHeading={
                          <Typography
                            typography="s2_1"
                            fontWeight="fontWeightMedium"
                            color="text.primary"
                          >
                            {formattedStartTime}
                          </Typography>
                        }
                      />
                    </Box>

                    <Box flex="1">
                      <HeadingAndSubheading
                        heading={
                          <Typography typography="s2_1" color="text.disabled">
                            Duration
                          </Typography>
                        }
                        subHeading={
                          <Typography
                            typography="s2_1"
                            fontWeight="fontWeightMedium"
                            color="text.primary"
                          >
                            {selectedNode?.latency_ms != null
                              ? `${selectedNode.latency_ms / 1000}s`
                              : "-"}
                          </Typography>
                        }
                      />
                    </Box>
                  </>
                ) : (
                  <Box flex="1">
                    <HeadingAndSubheading
                      heading={
                        <Typography typography="s2_1" color="text.disabled">
                          Duration
                        </Typography>
                      }
                      subHeading={
                        <Typography
                          typography="s2_1"
                          fontWeight="fontWeightMedium"
                          color="text.primary"
                        >
                          {selectedNode?.latency_ms != null
                            ? `${selectedNode.latency_ms / 1000}s`
                            : "-"}
                        </Typography>
                      }
                    />
                  </Box>
                )}
              </Stack>
            </Stack>
            <BottomAttributesTab
              observationSpan={selectedNode}
              isLoading={isLoading}
              sx={{
                maxHeight: "250px",
                overflow: "auto",
              }}
            />
          </Grid>
        </Grid>
      </Stack>
      <TraceDetailDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        traceData={
          isDrawerOpen && selectedNode
            ? {
                traceId: selectedNode?.trace_id ?? selectedNode?.trace,
                spanId: selectedNode?.id,
              }
            : null
        }
        setTraceDetailDrawerOpen={(val) => setIsDrawerOpen(Boolean(val))}
        viewOptions={{
          showAnnotation: true,
          showNavigation: true,
          showInsights: false,
        }}
      />
    </>
  );
};

export default InsightsAndTraces;
