import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Divider,
  Menu,
  MenuItem,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import PropTypes from "prop-types";
import ApexCharts from "apexcharts";
import { PRIORITIES, priorityMapper } from "./common";
import CustomTooltip from "src/components/tooltip/CustomTooltip";
import { format } from "date-fns";

export const ErrorCell = ({ value }) => {
  if (!value) return null;
  const { name, type } = value;
  return (
    <Stack
      direction={"column"}
      gap={0}
      sx={{
        height: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <CustomTooltip arrow show={true} title={name}>
        <Typography
          typography={"s2"}
          fontWeight={"fontWeightRegular"}
          color={"text.primary"}
          overflow={"hidden"}
          textOverflow={"ellipsis"}
          whiteSpace={"nowrap"}
        >
          {name}
        </Typography>
      </CustomTooltip>
      <Stack direction={"row"} alignItems={"center"} gap={0.5}>
        <Box
          sx={{
            height: 4,
            width: 4,
            borderRadius: "50%",
            bgcolor: "orange.500",
            flexShrink: 0,
          }}
        />
        <Typography
          typography={"s2"}
          fontWeight={"fontWeightRegular"}
          color={"text.disabled"}
          overflow={"hidden"}
          textOverflow={"ellipsis"}
          whiteSpace={"nowrap"}
        >
          {type}
        </Typography>
      </Stack>
      {/* <Stack direction={"row"} gap={0.2} alignItems={"center"}>
        <Box
          component={"img"}
          src={modelLogo}
          sx={{
            height: 8,
            width: 8,
          }}
        />
        <Typography
          sx={{
            fontSize: "8px",
            fontWeight: "fontWeightRegular",
            color: "text.primary",
          }}
        >
          {model}
        </Typography>
      </Stack> */}
    </Stack>
  );
};

ErrorCell.propTypes = {
  value: PropTypes.shape({
    name: PropTypes.string,
    type: PropTypes.string,
    model: PropTypes.string,
    modelLogo: PropTypes.string,
  }),
};

export const AssigneeCell = ({ value }) => {
  if (!value) return null;
  return (
    <Typography
      typography="s2"
      color={"text.primary"}
      fontWeight={"fontWeightRegular"}
      sx={{
        "text-overflow": "ellipsis",
        "white-space": "nowrap",
        overflow: "hidden",
      }}
    >
      {value.join(", ")}
    </Typography>
  );
};

AssigneeCell.propTypes = {
  value: PropTypes.array,
};

export const TrendsCell = ({ value }) => {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!value || !Array.isArray(value) || value.length === 0) return;
    if (!chartRef.current) return;

    const chartOptions = {
      chart: {
        type: "bar",
        height: 50,
        sparkline: { enabled: true },
        toolbar: { show: false },
        background: "transparent",
        animations: {
          enabled: false,
        },
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: "100%",
          borderRadiusApplication: "end",
          distributed: true,
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
      grid: {
        padding: {
          top: 0,
          left: 0,
          right: 0,
        },
      },
      colors: ["#78B4F9"],
      series: [
        {
          name: "Events",
          data: value.map((item) => ({
            x: item?.timestamp,
            y: item?.value,
            users: item?.users,
          })),
        },
      ],
      dataLabels: {
        enabled: false,
      },
      tooltip: {
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
          padding: 0px 6px;
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
          padding: 0px 12px;
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

      xaxis: {
        categories: value.map((_, index) => index + 1),
      },
      yaxis: {
        show: false,
        min: 0,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ["transparent"],
      },
      fill: {
        opacity: 1,
        type: "solid",
      },
    };

    const chart = new ApexCharts(chartRef.current, chartOptions);
    chart.render();

    return () => {
      if (chart) {
        chart.destroy();
      }
    };
  }, [value]);

  // Render nothing if no chart data
  if (!value || !Array.isArray(value) || value.length === 0) {
    return "-";
  }

  return (
    <div
      ref={chartRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    />
  );
};

TrendsCell.propTypes = {
  value: PropTypes.arrayOf(
    PropTypes.shape({
      timestamp: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      users: PropTypes.number.isRequired,
    }),
  ),
};

export const PriorityCell = ({ value }) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // const handleOpen = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const trigger = PRIORITIES.includes(value.toLowerCase()) ? (
    <Stack
      // onClick={handleOpen}
      direction="row"
      sx={{
        bgcolor: priorityMapper?.[value.toLowerCase()]?.bgColor,
        padding: theme.spacing(0.5, 1),
        gap: theme.spacing(1),
        cursor: "pointer",
      }}
    >
      <Box
        component="img"
        sx={{ height: 20, width: 20 }}
        src={priorityMapper?.[value.toLowerCase()]?.icon}
      />
      <Typography
        typography="s1"
        fontWeight="fontWeightMedium"
        color={theme.palette.text.primary}
        sx={{ textTransform: "capitalize" }}
      >
        {value}
      </Typography>
    </Stack>
  ) : (
    <Box
      // onClick={handleOpen}
      sx={{
        backgroundColor: "background.neutral",
        padding: theme.spacing(0.5, 1),
        cursor: "pointer",
      }}
    >
      <Typography>--</Typography>
    </Box>
  );

  return (
    <>
      {trigger}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        PaperProps={{
          elevation: 3,
          sx: { borderRadius: 1, px: theme.spacing(1.5), minWidth: 200 },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 1,
            py: 1,
          }}
        >
          <Typography
            typography={"s1"}
            fontWeight="fontWeightMedium"
            color="text.primary"
          >
            Set a priority
          </Typography>
        </Box>

        <Divider sx={{ mb: 1, borderColor: "divider" }} />
        {PRIORITIES.filter((p) => p !== value).map((option) => (
          <MenuItem
            key={option}
            onClick={() => {
              // handleItemClick(option)
              handleClose();
            }}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              transition: "all 0.2s ease-in-out",
              "& .action-label": {
                transition: "all 0.2s ease-in-out",
              },
              "&:hover, &:active": {
                fontWeight: "fontWeightMedium",
                "& .action-label": {
                  fontWeight: "fontWeightMedium",
                },
              },
            }}
          >
            <Stack
              direction="row"
              sx={{
                bgcolor: priorityMapper?.[option]?.bgColor,
                padding: theme.spacing(0.5, 1),
                gap: theme.spacing(1),
                cursor: "pointer",
                width: "fit-content",
              }}
            >
              <Box
                component="img"
                sx={{ height: 20, width: 20 }}
                src={priorityMapper?.[option]?.icon}
              />
              <Typography
                typography="s1"
                fontWeight="fontWeightMedium"
                color={theme.palette.text.primary}
                sx={{ textTransform: "capitalize" }}
              >
                {option}
              </Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

PriorityCell.propTypes = {
  value: PropTypes.oneOf(["high", "low", "mid", "urgent"]),
};
