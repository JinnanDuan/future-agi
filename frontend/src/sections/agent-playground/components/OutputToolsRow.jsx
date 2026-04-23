import React from "react";
import PropTypes from "prop-types";
import { Stack } from "@mui/material";
import CustomModelTools from "src/components/custom-model-tools";
import CustomTooltip from "src/components/tooltip";
import ResponseFormatDropdown from "./ResponseFormatDropdown";

export default function OutputToolsRow({
  control,
  isModelSelected,
  responseFormatMenuItems,
  onCreateSchema,
  modelConfig,
  onToolsApply,
  disabled,
}) {
  const tooltipProps = {
    show: !isModelSelected,
    title: "Select a model first",
    placement: "bottom",
    arrow: true,
    size: "small",
  };

  return (
    <Stack direction="row" gap={1} alignItems="center">
      <CustomTooltip {...tooltipProps}>
        <span>
          <ResponseFormatDropdown
            control={control}
            fieldName="modelConfig.responseFormat"
            options={responseFormatMenuItems}
            disabled={!isModelSelected || disabled}
            onCreateSchema={onCreateSchema}
          />
        </span>
      </CustomTooltip>
      <CustomTooltip {...tooltipProps}>
        <span>
          <CustomModelTools
            isModalContainer
            handleApply={onToolsApply}
            tools={modelConfig?.tools || []}
            disableClick={!isModelSelected || disabled}
            disableHover={
              !modelConfig?.tools ||
              modelConfig?.tools.length === 0 ||
              !isModelSelected ||
              disabled
            }
            label="Tools"
          />
        </span>
      </CustomTooltip>
    </Stack>
  );
}

OutputToolsRow.propTypes = {
  control: PropTypes.any.isRequired,
  isModelSelected: PropTypes.bool.isRequired,
  responseFormatMenuItems: PropTypes.array.isRequired,
  onCreateSchema: PropTypes.func.isRequired,
  modelConfig: PropTypes.object,
  onToolsApply: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
