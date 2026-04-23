import React, { useMemo } from "react";
import { alpha, Box, Divider, Typography } from "@mui/material";
import PropTypes from "prop-types";
import _ from "lodash";

const EXCLUDED_KEYS = new Set([
  "model",
  "tools",
  "toolChoice",
  "modelDetail",
  "modelType",
  "outputFormat",
  "responseFormat",
  "booleans",
  "dropdowns",
  "id",
]);

const CellStyle = ({ heading, value }) => {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
      <Typography
        variant="s3"
        fontWeight={"fontWeightMedium"}
        color="text.primary"
      >
        {heading}
      </Typography>
      <Typography
        variant="s3"
        fontWeight={"fontWeightRegular"}
        color="text.primary"
      >
        {value}
      </Typography>
    </Box>
  );
};

CellStyle.propTypes = {
  heading: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const ToolHoverState = ({ config, disabledHover }) => {
  const responseValue =
    typeof config?.responseFormat === "string"
      ? config?.responseFormat
      : config?.responseFormat?.name;

  const paramEntries = useMemo(() => {
    if (!config) return [];
    return Object.entries(config).filter(
      ([key, value]) =>
        !EXCLUDED_KEYS.has(key) &&
        value !== null &&
        value !== undefined &&
        (typeof value === "number" || typeof value === "string"),
    );
  }, [config]);

  const booleanEntries = useMemo(() => {
    if (!config?.booleans || typeof config.booleans !== "object") return [];
    return Object.entries(config.booleans).filter(
      ([, value]) => value !== null && value !== undefined,
    );
  }, [config?.booleans]);

  const dropdownEntries = useMemo(() => {
    if (!config?.dropdowns || typeof config.dropdowns !== "object") return [];
    return Object.entries(config.dropdowns).filter(
      ([, value]) => value !== null && value !== undefined,
    );
  }, [config?.dropdowns]);

  if (disabledHover) {
    return "Parameters";
  }

  return (
    <Box
      sx={{
        padding: "8px",
        backgroundColor: "background.paper",
        borderRadius: "8px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
        boxShadow: (theme) =>
          `4px 4px 16px 0px ${alpha(theme.palette.common.black, 0.1)}`,
      }}
    >
      <Box
        sx={{
          width: "100%",
        }}
      >
        <Typography
          variant="s3"
          fontWeight={"fontWeightSemiBold"}
          color="text.primary"
        >
          Parameters
        </Typography>
      </Box>
      <Divider />
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {paramEntries.map(([key, value]) => (
          <CellStyle key={key} heading={`${_.startCase(key)}:`} value={value} />
        ))}
        {booleanEntries.map(([key, value]) => (
          <CellStyle
            key={key}
            heading={`${_.startCase(key)}:`}
            value={String(value)}
          />
        ))}
        {dropdownEntries.map(([key, value]) => (
          <CellStyle
            key={key}
            heading={`${_.startCase(key)}:`}
            value={_.startCase(String(value))}
          />
        ))}
        {responseValue && (
          <CellStyle heading="Response Type:" value={responseValue} />
        )}
      </Box>
    </Box>
  );
};

export default ToolHoverState;

ToolHoverState.propTypes = {
  config: PropTypes.object,
  disabledHover: PropTypes.bool,
};
