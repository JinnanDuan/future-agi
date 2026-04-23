import { TextField, Typography } from "@mui/material";
import PropTypes from "prop-types";
import React from "react";
import { AdvanceNumberFilterOperators } from "src/utils/constants";
import { handleNumericInput } from "../common";
import { FormSearchSelectFieldState } from "src/components/FromSearchSelectField";

const NumberValueSelector = ({ definition, filter, updateFilter }) => {
  const values = filter.filterConfig;

  const operators =
    definition?.overrideOperators || AdvanceNumberFilterOperators;

  return (
    <>
      <FormSearchSelectFieldState
        onChange={(e) => {
          updateFilter(filter.id, (existingFilter) => ({
            ...existingFilter,
            filterConfig: {
              ...existingFilter.filterConfig,
              filterOp: e.target.value,
            },
          }));
        }}
        label=""
        value={values?.filterOp || ""}
        size="small"
        options={operators.map(({ label, value }) => ({
          label,
          value,
        }))}
      />
      <TextField
        sx={{
          width: "80px",
        }}
        type="text"
        label="Value"
        placeholder="Value"
        size="small"
        value={values?.filterValue?.[0] || ""}
        onChange={(e) => {
          const value = handleNumericInput(e.target.value);
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
      />
      {["between", "not_in_between"].includes(values?.filterOp) ? (
        <>
          <Typography
            variant="s2"
            fontWeight={"fontWeightRegular"}
            color="text.primary"
          >
            and
          </Typography>
          <TextField
            sx={{ width: "80px" }}
            type="text"
            placeholder="Value"
            size="small"
            value={values?.filterValue?.[1] || ""}
            onChange={(e) => {
              const value = handleNumericInput(e.target.value);
              updateFilter(filter.id, (existingFilter) => ({
                ...existingFilter,
                filterConfig: {
                  ...existingFilter.filterConfig,
                  filterValue: [
                    existingFilter?.filterConfig?.filterValue?.[0] || "",
                    value,
                  ],
                },
              }));
            }}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
};

NumberValueSelector.propTypes = {
  definition: PropTypes.object,
  filter: PropTypes.object,
  updateFilter: PropTypes.func,
};

export default NumberValueSelector;
