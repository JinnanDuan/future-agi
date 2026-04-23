import React from "react";
import PropTypes from "prop-types";
import ReactApexChart from "react-apexcharts";
import { useTheme } from "@mui/material/styles";

export default function WidgetHeatmap({ config }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const series = config.series || [];

  const options = {
    chart: {
      type: "heatmap",
      background: "transparent",
      foreColor: isDark ? "#a1a1aa" : "#666",
      toolbar: { show: false },
    },
    theme: { mode: isDark ? "dark" : "light" },
    dataLabels: { enabled: config.showValues ?? false },
    colors: [config.color || "#7B56DB"],
    plotOptions: {
      heatmap: {
        radius: 2,
        colorScale: {
          ranges: config.ranges || [
            { from: 0, to: 25, color: "#e0e7ff", name: "Low" },
            { from: 26, to: 50, color: "#818cf8", name: "Medium" },
            { from: 51, to: 75, color: "#6366f1", name: "High" },
            { from: 76, to: 100, color: "#4338ca", name: "Very High" },
          ],
        },
      },
    },
    xaxis: { categories: config.categories || [] },
    grid: { borderColor: isDark ? "#27272a" : "#f0f0f0" },
    tooltip: { theme: isDark ? "dark" : "light" },
  };

  return (
    <ReactApexChart
      options={options}
      series={series}
      type="heatmap"
      height="100%"
    />
  );
}

WidgetHeatmap.propTypes = { config: PropTypes.object.isRequired };
