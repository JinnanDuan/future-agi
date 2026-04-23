import { Box, Stack, Typography, useTheme } from "@mui/material";
import { format } from "date-fns";
import PropTypes from "prop-types";
import React from "react";
import ReactApexChart from "react-apexcharts";

export const Card = ({ label, value }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        padding: theme.spacing(0.7, 1.5),
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        flex: 1,
      }}
    >
      <Typography
        typography={"s2"}
        color={"text.primary"}
        fontWeight={"fontWeightMedium"}
      >
        {label}
      </Typography>
      <Typography
        typography={"s1"}
        color={"text.primary"}
        fontWeight={"fontWeightMedium"}
      >
        {value}
      </Typography>
    </Box>
  );
};

Card.propTypes = {
  label: PropTypes.string,
  value: PropTypes.any,
};

export const ColumnChart = ({ trends }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const series = [
    {
      name: "Count",
      data: trends.map((item) => ({
        x: item?.timestamp,
        y: item?.value,
        users: item?.users,
      })),
    },
  ];

  const options = {
    chart: {
      type: "bar",
      height: 140,
      background: "transparent",
      foreColor: isDark ? "#a1a1aa" : undefined,
      toolbar: { show: false },
    },
    theme: {
      mode: isDark ? "dark" : "light",
    },
    plotOptions: {
      bar: {
        columnWidth: "60%",
        horizontal: false,
        distributed: false,
        dataLabels: {
          position: "top",
        },
      },
    },
    states: {
      hover: {
        filter: {
          type: "none",
        },
      },
      active: {
        filter: {
          type: "none",
        },
      },
    },
    dataLabels: { enabled: false },
    stroke: { width: 1, colors: ["var(--bg-paper)"] },
    xaxis: {
      type: "datetime",
      labels: {
        style: {
          fontSize: "11px",
          colors: "var(--text-secondary)",
          fontWeight: 400,
        },
      },
    },
    yaxis: {
      title: { show: false },
      min: 0,
    },
    colors: ["#78B4F9"],
    fill: { opacity: 0.8 },
    tooltip: {
      theme: isDark ? "dark" : "light",
      enabled: true,
      followCursor: true,
      custom: function ({ _, seriesIndex, dataPointIndex, w }) {
        const item = w.config.series[seriesIndex].data[dataPointIndex];
        const date = new Date(item.x);
        const formattedDate = format(date, "MMM dd, yyyy, hh:mm a");

        return `
          <div style="
            width: 194px;
            background: var(--bg-paper);
            border-radius: 4px;
            border: 1px solid var(--border-default);
            font-size: 12px;
            overflow: hidden;
            color: var(--text-primary);
          ">
            <!-- Header section with background -->
            <div style="
              background-color: var(--bg-subtle);
              padding: 12px 12px;
              font-weight: 400;
            ">
              ${formattedDate}
            </div>
            <!-- Divider -->
            <div style="
              height: 2px;
              background-color: var(--border-default);
              margin: 0;
            "></div>
            <!-- Events/Users section -->
            <div style="
              padding: 12px 12px;
              display: flex;
              gap: 20px;
            ">
              <span style="display: flex; align-items: center; gap: 6px;">
                <span style="
                  width: 12px;
                  height: 12px;
                  border-radius: 50%;
                  background: #4990e1;
                  display: inline-block;
                "></span>
                Events: ${item.y}
              </span>
              ${
                item.users > 0
                  ? `<span style="display: flex; align-items: center; gap: 6px;">
            <span style="
              width: 12px;
              height: 12px;
              border-radius: 50%;
              background: #cf6be8;
              display: inline-block;
            "></span>
            Users: ${item.users}
          </span>`
                  : ""
              }
            </div>
          </div>
        `;
      },
    },
    grid: {
      borderColor: "var(--border-default)",
      row: { colors: ["var(--bg-subtle)", "transparent"], opacity: 0.5 },
    },
    legend: { show: false },
  };

  return (
    <div style={{ width: "100%" }}>
      <ReactApexChart
        options={options}
        series={series}
        type="bar"
        height={140}
        width="100%"
      />
    </div>
  );
};

ColumnChart.propTypes = {
  trends: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
      users: PropTypes.number.isRequired,
    }),
  ),
};

export default function ColumnChartContainer({ trends, users, events }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "8px",
        padding: theme.spacing(2),
      }}
    >
      <Stack direction={"row"} gap={theme.spacing(2)}>
        <Stack gap={theme.spacing(2)}>
          <Card label={"Events"} value={events} />
          <Card label={"Users"} value={users} />
        </Stack>
        <ColumnChart trends={trends ?? []} />
      </Stack>
    </Box>
  );
}

ColumnChartContainer.propTypes = {
  trends: PropTypes.array,
  users: PropTypes.number,
  events: PropTypes.number,
};
