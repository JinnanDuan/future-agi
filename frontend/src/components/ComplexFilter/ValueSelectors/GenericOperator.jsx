import PropTypes from "prop-types";
import React from "react";
import { FormSearchSelectFieldState } from "src/components/FromSearchSelectField";
import {
  BooleanFilterOperators,
  TextFilterOperators,
} from "src/utils/constants";
import { NULL_OPERATORS } from "../common";

const OPERATORS = {
  text: TextFilterOperators,
  boolean: BooleanFilterOperators,
};

export default function GenericOperator({ definition, filter, updateFilter }) {
  const values = filter?.filterConfig;

  const operators =
    definition?.overrideOperators || OPERATORS[values?.filterType] || [];

  return (
    <FormSearchSelectFieldState
      size="small"
      showClear={false}
      label={"Operator"}
      options={operators}
      value={values?.filterOp || ""}
      onChange={(e) => {
        updateFilter(filter.id, (existingFilter) => ({
          ...existingFilter,
          filterConfig: {
            ...existingFilter.filterConfig,
            filterOp: e.target.value,
            ...(NULL_OPERATORS.includes(e.target.value) && { filterValue: "" }),
          },
        }));
      }}
    />
  );
}

GenericOperator.propTypes = {
  definition: PropTypes.object,
  filter: PropTypes.object,
  updateFilter: PropTypes.func,
};
