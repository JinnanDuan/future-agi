import React from "react";
import PropTypes from "prop-types";
import { Box } from "@mui/material";
import EvaluateCell from "../EvaluateCellRenderer/EvaluateCell";
import CustomTooltip from "src/components/tooltip";
import { tooltipSlotProp } from "./cellRendererHelper";

const EvaluateCellRendererWrapper = ({
  valueReason,
  formattedValueReason,
  cellData,
  value,
  dataType,
  originType,
  isFutureAgiEval,
  choicesMap,
  outputType,
}) => (
  <CustomTooltip
    show={Boolean(valueReason?.length)}
    title={formattedValueReason()}
    enterDelay={500}
    enterNextDelay={500}
    leaveDelay={100}
    arrow
    expandable
    slotProps={tooltipSlotProp}
  >
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        // padding: "4px 8px",
      }}
    >
      <EvaluateCell
        cellData={cellData}
        value={value}
        dataType={dataType}
        meta={cellData?.metadata}
        isFutureAgiEval={isFutureAgiEval}
        originType={originType}
        choicesMap={choicesMap}
        outputType={outputType}
      />
    </Box>
  </CustomTooltip>
);

EvaluateCellRendererWrapper.propTypes = {
  valueReason: PropTypes.any,
  formattedValueReason: PropTypes.func.isRequired,
  cellData: PropTypes.object,
  value: PropTypes.any,
  dataType: PropTypes.string,
  originType: PropTypes.string,
  isFutureAgiEval: PropTypes.bool,
  choicesMap: PropTypes.object,
  outputType: PropTypes.string,
};

export default React.memo(EvaluateCellRendererWrapper);
