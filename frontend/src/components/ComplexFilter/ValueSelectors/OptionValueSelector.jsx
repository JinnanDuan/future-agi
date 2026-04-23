// @ts-nocheck
import { Typography } from "@mui/material";
import PropTypes from "prop-types";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { FormSearchSelectFieldControl } from "src/components/FromSearchSelectField";

const OptionValueSelector = ({ definition, filter, updateFilter }) => {
  const values = filter.filterConfig;

  // Initialize selected values
  const selectedValues = Array.isArray(values.filterValue)
    ? values.filterValue.filter(Boolean)
    : typeof values.filterValue === "string"
      ? values.filterValue.split(",").filter(Boolean)
      : [];

  // Set up React Hook Form
  const { control, watch, setValue } = useForm({
    defaultValues: {
      selectedOptions: definition.multiSelect
        ? selectedValues
        : selectedValues[0] || "",
    },
  });

  // Watch for changes in the form
  const watchedValue = watch("selectedOptions");

  // Update filter when form value changes
  useEffect(() => {
    if (watchedValue !== undefined) {
      const updatedValues = definition.multiSelect
        ? Array.isArray(watchedValue)
          ? watchedValue
          : []
        : watchedValue;

      updateFilter(filter.id, (existingFilter) => ({
        ...existingFilter,
        filterConfig: {
          ...existingFilter.filterConfig,
          filterValue: updatedValues,
          filterOp: definition.multiSelect ? "contains" : "equals",
        },
      }));
    }
  }, [watchedValue, definition.multiSelect, filter.id, updateFilter]);

  // Prepare options for the FormSearchSelectFieldControl
  const options =
    definition.filterType?.options.map(({ label, value }) => ({
      label: label,
      value: value,
    })) || [];

  // Update form value when filter changes externally
  useEffect(() => {
    const currentSelectedValues = Array.isArray(values.filterValue)
      ? values.filterValue.filter(Boolean)
      : typeof values.filterValue === "string"
        ? values.filterValue.split(",").filter(Boolean)
        : [];

    const newValue = definition.multiSelect
      ? currentSelectedValues
      : currentSelectedValues[0] || "";

    setValue("selectedOptions", newValue);
  }, [values.filterValue, definition.multiSelect, setValue]);

  return (
    <>
      <Typography
        variant="s1"
        fontWeight={"fontWeightRegular"}
        color="text.primary"
      >
        is
      </Typography>
      <FormSearchSelectFieldControl
        label={definition?.propertyName}
        size="small"
        control={control}
        sx={{ maxWidth: "200px", width: "100%" }}
        fieldName="selectedOptions"
        options={options}
        multiple={definition.multiSelect}
        checkbox={definition.multiSelect}
      />
    </>
  );
};

OptionValueSelector.propTypes = {
  definition: PropTypes.object,
  filter: PropTypes.object,
  updateFilter: PropTypes.func,
};

export default OptionValueSelector;
