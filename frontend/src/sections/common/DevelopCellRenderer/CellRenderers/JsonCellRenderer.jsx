import React from "react";
import { Box } from "@mui/material";
import PropTypes from "prop-types";
import CustomTooltip from "src/components/tooltip";
import RenderMeta from "../RenderMeta";
import CustomJsonViewer from "./CustomJsonCellViewer";
import logger from "src/utils/logger";

const JsonCellRenderer = ({
  isHover,
  value,
  valueReason,
  formattedValueReason,
  originType,
  metadata,
  valueInfos,
}) => {
  let parsedJson = value;
  if (typeof value === "string") {
    try {
      parsedJson = JSON.parse(value);
    } catch (err) {
      logger.error("Invalid JSON string:", value);
    }
  }

  return (
    <CustomTooltip
      show={Boolean(valueReason?.length)}
      title={formattedValueReason()}
      enterDelay={500}
      enterNextDelay={500}
      leaveDelay={100}
      arrow
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: metadata?.responseTimeMs ? "space-between" : "start",
          padding: "4px 8px",
          fontFamily: "monospace",
        }}
      >
        <Box
          sx={{
            maxHeight: "100%",
            overflowY: "auto",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            "&::-webkit-scrollbar": {
              display: "none",
            },
          }}
        >
          <CustomJsonViewer object={parsedJson} />
        </Box>

        {isHover && (
          <Box
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={(e) => e.stopPropagation()}
            onMouseLeave={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <RenderMeta
              originType={originType}
              meta={metadata}
              valuesInfo={valueInfos}
            />
          </Box>
        )}
      </Box>
    </CustomTooltip>
  );
};

JsonCellRenderer.propTypes = {
  isHover: PropTypes.bool,
  value: PropTypes.any,
  valueReason: PropTypes.string,
  formattedValueReason: PropTypes.func,
  originType: PropTypes.string,
  metadata: PropTypes.object,
  valueInfos: PropTypes.any,
};

export default React.memo(JsonCellRenderer);
