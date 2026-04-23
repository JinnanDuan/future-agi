import React from "react";
import { Box, IconButton, MenuItem, Typography } from "@mui/material";
import Iconify from "src/components/iconify";
import CustomPopover, { usePopover } from "src/components/custom-popover";
import PropTypes from "prop-types";
import useToggleAnnotationsStore from "../store";
import SvgColor from "src/components/svg-color";
import { ShowComponent } from "src/components/show";

const AnnotationHeaderCellRenderer = ({
  displayName,
  metricId,
  isTextType = null,
}) => {
  const popover = usePopover();
  const toggleMetric = useToggleAnnotationsStore((s) => s.toggleMetric);
  const isExpanded = useToggleAnnotationsStore((s) =>
    s.showMetricsIds.includes(metricId),
  );

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        gap: 0.5,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 1,
          overflow: "hidden",
          flex: 1,
          minWidth: 0,
        }}
      >
        <SvgColor
          sx={{ width: "20px", flexShrink: 0 }}
          src="/assets/icons/ic_label.svg"
        />
        <Typography
          typography={"s2_1"}
          fontWeight={"fontWeightMedium"}
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {displayName}
        </Typography>
      </Box>
      <ShowComponent condition={!isTextType}>
        <IconButton size="small" onClick={popover.onOpen}>
          <Iconify icon="eva:more-vertical-fill" width={16} height={16} />
        </IconButton>
      </ShowComponent>

      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        arrow="top-right"
      >
        <MenuItem
          onClick={() => {
            toggleMetric(metricId);
            popover.onClose();
          }}
        >
          <Iconify icon={isExpanded ? "eva:eye-off-fill" : "eva:eye-fill"} />
          {isExpanded ? "Hide responses" : "View all responses"}
        </MenuItem>
      </CustomPopover>
    </Box>
  );
};

AnnotationHeaderCellRenderer.propTypes = {
  displayName: PropTypes.string,
  metricId: PropTypes.string,
  isTextType: PropTypes.string,
};

export default AnnotationHeaderCellRenderer;
