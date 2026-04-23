import { Box, IconButton, Stack, Typography, useTheme } from "@mui/material";
import React from "react";
import { FormSearchSelectFieldState } from "src/components/FromSearchSelectField";
import PropTypes from "prop-types";
import SvgColor from "src/components/svg-color";
import {
  useAlertSheetFilterOptions,
  useAlertSheetFilterShallow,
} from "../../store/useAlertSheetFilterStore";

const FilterRow = ({
  availableFilterOptions,
  filterType,
  updateFilterTypeByIndex,
  updateFilterValueByIndex,
  filterValue,
  options,
  onRemove,
}) => {
  return (
    <Stack direction={"row"} alignItems={"center"} gap={3}>
      <FormSearchSelectFieldState
        size="small"
        label={"Property"}
        value={filterType}
        options={availableFilterOptions}
        onChange={updateFilterTypeByIndex}
      />
      <Typography>is</Typography>
      <FormSearchSelectFieldState
        size="small"
        label={"Value"}
        value={filterValue}
        options={options}
        onChange={updateFilterValueByIndex}
      />
      <IconButton onClick={onRemove}>
        <SvgColor
          sx={{
            height: 20,
            width: 20,
            bgcolor: "text.disabled",
          }}
          src="/assets/icons/ic_delete.svg"
        />
      </IconButton>
    </Stack>
  );
};

FilterRow.propTypes = {
  availableFilterOptions: PropTypes.array,
  filterType: PropTypes.string,
  filterValue: PropTypes.string,
  updateFilterTypeByIndex: PropTypes.func,
  updateFilterValueByIndex: PropTypes.func,
  options: PropTypes.array,
  onRemove: PropTypes.func,
};
export default function SheetFilters() {
  const theme = useTheme();
  const {
    activeFilters,
    updateFilterTypeByIndex,
    updateFilterValueByIndex,
    removeFilterByIndex,
  } = useAlertSheetFilterShallow();
  const availableFilterOptions = useAlertSheetFilterOptions();
  return (
    <Box
      sx={{
        border: `1px solid`,
        borderColor: "divider",
        borderRadius: theme.spacing(0.5),
        padding: theme.spacing(2),
      }}
    >
      <Stack>
        {activeFilters?.map((filter, index) => (
          <FilterRow
            key={index}
            availableFilterOptions={availableFilterOptions}
            filterType={filter?.filterType}
            filterValue={filter?.filterValue}
            updateFilterTypeByIndex={(e) =>
              updateFilterTypeByIndex(index, e.target.value)
            }
            updateFilterValueByIndex={(e) =>
              updateFilterValueByIndex(index, e.target.value)
            }
            options={filter?.options}
            onRemove={() => removeFilterByIndex(index)}
          />
        ))}
      </Stack>
    </Box>
  );
}
