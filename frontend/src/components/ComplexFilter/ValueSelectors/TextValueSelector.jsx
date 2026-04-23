import { TextField, Typography } from "@mui/material";
import PropTypes from "prop-types";
import React from "react";

const TextValueSelector = ({ definition, filter, updateFilter }) => {
  const values = filter.filterConfig;

  return (
    <>
      <Typography
        variant="s1"
        fontWeight={"fontWeightRegular"}
        color="text.primary"
      >
        is
      </Typography>
      <TextField
        sx={{
          width: "200px",
        }}
        label={definition?.propertyName}
        placeholder="Value"
        size="small"
        value={values?.filterValue || ""}
        onChange={(e) =>
          updateFilter(filter.id, (existingFilter) => ({
            ...existingFilter,
            filterConfig: {
              ...existingFilter.filterConfig,
              filterValue: e.target.value,
            },
          }))
        }
      />
    </>
  );
};

TextValueSelector.propTypes = {
  definition: PropTypes.object,
  filter: PropTypes.object,
  updateFilter: PropTypes.func,
};

export default TextValueSelector;
