import React from "react";
import PropTypes from "prop-types";
import { Typography } from "@mui/material";
import { FormSearchSelectFieldState } from "src/components/FromSearchSelectField";

const NumberValueOptionSelector = ({ definition, filter, updateFilter }) => {
  const values = filter.filterConfig;
  return (
    <>
      <Typography variant="s1">is</Typography>
      <FormSearchSelectFieldState
        onChange={(e) => {
          const value = e.target.value;
          updateFilter(filter.id, (existingFilter) => ({
            ...existingFilter,
            filterConfig: {
              ...existingFilter.filterConfig,
              filterValue: [
                value,
                existingFilter?.filterConfig?.filterValue?.[1] || "",
              ],
            },
          }));
        }}
        label={definition?.propertyName}
        value={values?.filterValue?.[0]}
        size="small"
        options={definition.filterType.options.map(({ label, value }) => ({
          label,
          value,
        }))}
      />
    </>
  );
};

NumberValueOptionSelector.propTypes = {
  definition: PropTypes.object,
  filter: PropTypes.object,
  updateFilter: PropTypes.func,
};

export default NumberValueOptionSelector;
