import { Box, Stack, Typography, useTheme, Button } from "@mui/material";
import React, { useMemo } from "react";
import FilterRow from "src/components/feed/FilterRow";
import FeedTable from "src/components/feed/FeedTable";
import { useLLMTracingFilters } from "src/sections/projects/LLMTracing/useLLMTracingFilters";
import { getFilterExtraProperties } from "src/utils/prototypeObserveUtils";
import { getDefaultFilter } from "src/sections/workbench/createPrompt/Metrics/common";
import { formatDate } from "src/utils/report-utils";
import { endOfToday, sub } from "date-fns";
import SvgColor from "src/components/svg-color";

const getDefaultDateRange = () => {
  const getDateArray = () => {
    return [
      formatDate(
        sub(new Date(), {
          months: 6,
        }),
      ),
      formatDate(endOfToday()),
    ];
  };

  return {
    dateFilter: getDateArray(),
    dateOption: "6M",
  };
};

export default function FeedView() {
  const theme = useTheme();
  const defaultDateFilter = useMemo(() => getDefaultDateRange(), []);
  const defaultFilter = useMemo(() => getDefaultFilter(), []);
  const {
    filters: primaryTraceFilters,
    setFilters: setPrimaryTraceFilters,
    validatedFilters: primaryTraceValidatedFilters,
    // setDateFilter: setPrimaryTraceDateFilter,
    // dateFilter: primaryTraceDateFilter,
  } = useLLMTracingFilters(
    defaultFilter,
    defaultDateFilter,
    "primaryTraceFilter",
    "primaryTraceDateFilter",
    [],
    getFilterExtraProperties,
  );

  return (
    <Box
      sx={{
        padding: theme.spacing(2),
        display: "flex",
        flex: 1,
        flexDirection: "column",
        gap: theme.spacing(2),
        bgcolor: "background.paper",
      }}
    >
      <Stack>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography
            color="text.primary"
            typography="m2"
            fontWeight={"fontWeightSemiBold"}
          >
            Feed
          </Typography>
          <Button
            variant="outlined"
            size="large"
            sx={{
              color: "text.primary",
              borderColor: "divider",
              padding: 1.5,
              fontSize: "14px",
              height: "38px",
            }}
            startIcon={<SvgColor src="/assets/icons/ic_docs_single.svg" />}
            component="a"
            href="https://docs.futureagi.com/docs/error-feed"
            target="_blank"
          >
            View Docs
          </Button>
        </Box>
        <Typography
          typography="s1"
          color="text.primary"
          fontWeight={"fontWeightRegular"}
        >
          Track, capture, and resolve errors from one place
        </Typography>
      </Stack>
      <FilterRow
        primaryTraceFilters={primaryTraceFilters}
        setPrimaryTraceFilters={setPrimaryTraceFilters}
        primaryTraceValidatedFilters={primaryTraceValidatedFilters}
      />
      <FeedTable filters={primaryTraceValidatedFilters} />
    </Box>
  );
}
