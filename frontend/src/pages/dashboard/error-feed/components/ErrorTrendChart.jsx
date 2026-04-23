import React, { useEffect, useRef } from "react";
import { Box, Stack, Typography, useTheme, alpha } from "@mui/material";
import ApexCharts from "apexcharts";
import { format } from "date-fns";
import PropTypes from "prop-types";

export default function ErrorTrendChart({ trends, events, users }) {
  const chartRef = useRef(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  useEffect(() => {
    if (!trends?.length || !chartRef.current) return;

    const options = {
      chart: {
        type: "bar",
        height: 110,
        toolbar: { show: false },
        background: "transparent",
        animations: { enabled: false },
        sparkline: { enabled: false },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "75%",
          borderRadius: 2,
          borderRadiusApplication: "end",
        },
      },
      dataLabels: { enabled: false },
      series: [
        {
          name: "Events",
          data: trends.map((d) => ({
            x: new Date(d.timestamp).getTime(),
            y: d.value,
          })),
        },
        {
          name: "Users",
          data: trends.map((d) => ({
            x: new Date(d.timestamp).getTime(),
            y: d.users,
          })),
        },
      ],
      colors: [
        isDark ? "#7857FC" : "#7857FC",
        isDark ? alpha("#CF6BE8", 0.85) : "#CF6BE8",
      ],
      fill: {
        opacity: [0.85, 0.75],
      },
      xaxis: {
        type: "datetime",
        axisBorder: { show: false },
        axisTicks: { show: false },
        labels: {
          style: { fontSize: "10px", colors: isDark ? "#71717a" : "#938FA3" },
          formatter: (val) => format(new Date(val), "MMM d"),
        },
      },
      yaxis: {
        show: true,
        labels: {
          style: { fontSize: "10px", colors: isDark ? "#71717a" : "#938FA3" },
          formatter: (v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v),
        },
      },
      grid: {
        borderColor: isDark ? "#27272a" : "#E1DFEC",
        strokeDashArray: 3,
        padding: { top: -4, right: 4, bottom: 0, left: 4 },
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } },
      },
      legend: {
        show: true,
        position: "top",
        horizontalAlign: "right",
        fontSize: "11px",
        labels: { colors: isDark ? "#a1a1aa" : "#605C70" },
        markers: { width: 8, height: 8, radius: 2 },
        itemMargin: { horizontal: 8 },
      },
      tooltip: {
        theme: isDark ? "dark" : "light",
        x: { formatter: (val) => format(new Date(val), "MMM d, yyyy HH:mm") },
        y: { formatter: (v) => v?.toLocaleString() },
      },
      states: {
        hover: { filter: { type: "darken", value: 0.85 } },
        active: { filter: { type: "none" } },
      },
    };

    const chart = new ApexCharts(chartRef.current, options);
    chart.render();
    return () => {
      try {
        chart.destroy();
      } catch {
        /* ignore */
      }
    };
  }, [trends, isDark]);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        bgcolor: isDark ? "background.neutral" : "background.paper",
        overflow: "hidden",
      }}
    >
      {/* Stats header */}
      <Stack
        direction="row"
        alignItems="center"
        gap={3}
        sx={{
          px: 2,
          py: 1.25,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: isDark ? "background.accent" : "background.default",
        }}
      >
        <Stack gap={0}>
          <Typography
            sx={{
              fontSize: "20px",
              fontWeight: 700,
              color: "text.primary",
              lineHeight: 1.2,
              fontFeatureSettings: "'tnum'",
            }}
          >
            {events?.toLocaleString() ?? "—"}
          </Typography>
          <Typography sx={{ fontSize: "11px", color: "text.disabled" }}>
            Total events
          </Typography>
        </Stack>
        <Box sx={{ width: 1, height: 28, bgcolor: "divider" }} />
        <Stack gap={0}>
          <Typography
            sx={{
              fontSize: "20px",
              fontWeight: 700,
              color: "text.primary",
              lineHeight: 1.2,
              fontFeatureSettings: "'tnum'",
            }}
          >
            {users?.toLocaleString() ?? "—"}
          </Typography>
          <Typography sx={{ fontSize: "11px", color: "text.disabled" }}>
            Users affected
          </Typography>
        </Stack>
      </Stack>

      {/* Chart */}
      <Box sx={{ px: 1, pb: 0.5 }}>
        {trends?.length ? (
          <div ref={chartRef} />
        ) : (
          <Stack alignItems="center" justifyContent="center" height={110}>
            <Typography typography="s3" color="text.disabled">
              No trend data
            </Typography>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

ErrorTrendChart.propTypes = {
  trends: PropTypes.array,
  events: PropTypes.number,
  users: PropTypes.number,
};
