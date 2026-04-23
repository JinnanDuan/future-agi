import React from "react";
import { Box, Chip, Skeleton, useTheme } from "@mui/material";
import PropTypes from "prop-types";
import { ShowComponent } from "src/components/show";
import { getStatusColor } from "../common";
import { getLabel } from "../common";
import NumericCell from "src/sections/common/DevelopCellRenderer/EvaluateCellRenderer/NumericCell";
import { OutputTypes } from "src/sections/common/DevelopCellRenderer/CellRenderers/cellRendererHelper";

const SkeletonLoader = () => (
  <Box
    sx={{
      paddingX: 1,
      display: "flex",
      alignItems: "center",
      height: "100%",
    }}
  >
    <Skeleton sx={{ width: "100%", height: "10px" }} variant="rounded" />
  </Box>
);

const StatusCellRenderer = ({ cellValue, status, isLoading, type }) => {
  const theme = useTheme();

  if (status === "running" || isLoading) return <SkeletonLoader />;
  if (status === "error") {
    return (
      <Box
        sx={{
          marginLeft: theme.spacing(1),
          color: theme.palette.error.main,
          fontSize: "13px",
        }}
      >
        Error
      </Box>
    );
  }

  if (type === OutputTypes.NUMERIC) {
    return (
      <NumericCell
        value={cellValue}
        sx={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          paddingX: 1,
        }}
      />
    );
  }

  if (
    typeof cellValue === "string" &&
    cellValue?.startsWith("[") &&
    cellValue?.endsWith("]")
  ) {
    cellValue = JSON.parse(cellValue.replace(/'/g, '"'));
  }
  if (cellValue === undefined || cellValue === "" || cellValue === null) return;

  return (
    <>
      <ShowComponent condition={!Array.isArray(cellValue)}>
        <Chip
          variant="soft"
          label={getLabel(cellValue)}
          size="small"
          sx={{
            ...getStatusColor(cellValue, theme),
            transition: "none",
            "&:hover": {
              backgroundColor: getStatusColor(cellValue, theme).backgroundColor, // Lock it to same color
              boxShadow: "none",
            },
          }}
        />
      </ShowComponent>
      <ShowComponent condition={Array.isArray(cellValue)}>
        <ShowComponent condition={cellValue.length === 0}>
          <Chip
            variant="soft"
            label={"None"}
            size="small"
            sx={{
              backgroundColor: theme.palette.red.o10,
              color: theme.palette.red[500],
              marginRight: "10px",
              transition: "none",
              "&:hover": {
                backgroundColor: theme.palette.red.o10, // Lock it to same color
                boxShadow: "none",
              },
            }}
          />
        </ShowComponent>
        <ShowComponent condition={cellValue.length > 0}>
          <Box>
            <Chip
              variant="soft"
              label={getLabel(cellValue)}
              size="small"
              sx={{
                ...getStatusColor(cellValue, theme),
                marginRight: "10px",
                transition: "none",
                "&:hover": {
                  backgroundColor: getStatusColor(cellValue, theme)
                    .backgroundColor, // Lock it to same color
                  boxShadow: "none",
                },
              }}
            />
            {cellValue.length > 1 && (
              <Chip
                variant="soft"
                label={`+${cellValue.length - 1}`}
                size="small"
                sx={{
                  ...getStatusColor(cellValue, theme),
                  transition: "none",
                  "&:hover": {
                    backgroundColor: getStatusColor(cellValue, theme)
                      .backgroundColor, // Lock it to same color
                    boxShadow: "none",
                  },
                }}
              />
            )}
          </Box>
        </ShowComponent>
      </ShowComponent>
    </>
  );
};

StatusCellRenderer.propTypes = {
  cellValue: PropTypes.any,
  status: PropTypes.string,
  isLoading: PropTypes.bool,
  type: PropTypes.string,
};

export default StatusCellRenderer;
