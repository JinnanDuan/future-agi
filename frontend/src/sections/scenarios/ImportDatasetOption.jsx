import { Box } from "@mui/material";
import PropTypes from "prop-types";
import React, { useMemo } from "react";
import { useDevelopDatasetList } from "src/api/develop/develop-detail";
import { FormSearchSelectFieldControl } from "src/components/FromSearchSelectField";

const ImportDatasetOption = ({ control }) => {
  const { data } = useDevelopDatasetList();

  const datasetList = useMemo(() => {
    return data?.map((dataset) => ({
      label: dataset.name,
      value: dataset.datasetId,
    }));
  }, [data]);

  return (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderRadius: "4px",
        padding: 2,
        border: "1px solid",
        borderColor: "background.neutral",
      }}
    >
      <FormSearchSelectFieldControl
        control={control}
        fieldName="config.datasetId"
        label="Choose dataset"
        fullWidth
        placeholder="Select dataset"
        size="small"
        options={datasetList}
        required
      />
    </Box>
  );
};

ImportDatasetOption.propTypes = {
  control: PropTypes.object,
};

export default ImportDatasetOption;
